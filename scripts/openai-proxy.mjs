import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.PORT || 8787);
const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const MAX_BODY_BYTES = 16 * 1024 * 1024;

// KEEP IN SYNC z VISION_SYSTEM_PROMPT w src/services/gptVisionService.ts.
const VISION_SYSTEM_PROMPT = `Jestes ekspertem od wartosci odzywczych i szacowania porcji. Odpowiadasz TYLKO JSON-em, bez tekstu przed ani po.

ZRODLO PRAWDY (kolejnosc waznosci):
1. OPIS TEKSTOWY uzytkownika jest najwazniejszy. Jesli podaje ilosci ("3 jajka", "4 plastry boczku", "150g ryzu") — policz makro DOKLADNIE z tych ilosci, ze standardowych wartosci odzywczych. NIE zgaduj porcji ze zdjecia, gdy ilosc jest podana w tekscie.
2. ZDJECIE sluzy do: potwierdzenia, oszacowania skladnikow ktorych user NIE wymienil, oraz dookreslenia porcji tam gdzie opis jest niejasny ("troche ryzu", "duza michka").
3. Gdy opis i zdjecie sie roznia (user pisze 3 jajka, widac 2) — zaufaj OPISOWI, ale odnotuj rozbieznosc w "note".

METODA — licz skladnik po skladniku, nigdy "na oko" dla calosci:
- Rozbij posilek na pojedyncze skladniki.
- Dla kazdego osobno oszacuj protein_g, carbs_g, fat_g z typowych wartosci, np.:
  - jajko M ~ 6 B / 0 W / 5 T
  - plaster boczku ~ 3 B / 0 W / 4 T
  - 100g piersi z kurczaka ~ 31 B / 0 W / 4 T
  - kromka chleba ~ 3 B / 14 W / 1 T
  - lyzka oleju/oliwy ~ 0 / 0 / 14 T
  - 100g ugotowanego ryzu ~ 2.5 B / 28 W / 0.3 T
  (to przyklady-kotwice; dla innych skladnikow uzyj wiedzy o ich wartosciach)
- Zsumuj skladniki do protein_g, carbs_g, fat_g calego posilku.

KONTROLA:
- Sprawdz: protein_g*4 + carbs_g*4 + fat_g*9 powinno dac rozsadna kalorycznosc (obiad domowy 400-800, fast-food 500-1200, koktajl 200-600, przekaska 100-400). Jesli poza skala — popraw skladniki, nie sume.

PEWNOSC (confidence):
- high: user podal konkretne ilosci wszystkich glownych skladnikow.
- medium: czesc ilosci z opisu, czesc szacowana ze zdjecia.
- low: brak opisu lub mocno niejasna porcja; szacujesz glownie ze zdjecia.

JESLI NA ZDJECIU NIE MA JEDZENIA lub nie da sie nic oszacowac: zwroc zera, confidence "low", wyjasnij w "note".

POLA JSON:
dish_name (string)
items (array of {name: string, qty: string, protein_g: number, carbs_g: number, fat_g: number})
protein_g (number) = suma items
carbs_g (number) = suma items
fat_g (number) = suma items
confidence ("low"|"medium"|"high")
note (string|null) — rozbieznosci, zalozenia, niepewnosci`;

const buildUserText = (mealTitle) => {
  const description = typeof mealTitle === "string" ? mealTitle.trim() : "";
  return description
    ? `OPIS UZYTKOWNIKA (zrodlo prawdy): "${description}". Policz makro zgodnie z opisem (uzyj podanych ilosci doslownie), a zdjecia uzyj do potwierdzenia i dookreslenia skladnikow ktorych user nie wymienil.`
    : `Brak opisu tekstowego. Oszacuj makro calego posilku ze zdjecia, skladnik po skladniku.`;
};

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Zdjecie jest za duze. Wybierz mniejszy plik albo zrob nowe zdjecie."));
        req.destroy();
        return;
      }
      raw += chunk;
    });

    req.on("end", () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Niepoprawny JSON w request body."));
      }
    });

    req.on("error", reject);
  });
}

function parseOpenAiJson(payload) {
  const text =
    payload?.output_text ||
    payload?.output
      ?.flatMap((item) => item?.content ?? [])
      ?.map((content) => content?.text)
      ?.filter(Boolean)
      ?.join("\n");

  if (!text) {
    throw new Error("OpenAI nie zwrocil tekstowej odpowiedzi.");
  }

  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(cleaned);

  return {
    dish_name: String(parsed.dish_name || "Nieznane danie"),
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
    protein_g: Number(parsed.protein_g || 0),
    carbs_g: Number(parsed.carbs_g || 0),
    fat_g: Number(parsed.fat_g || 0),
    note: parsed.note == null ? null : String(parsed.note),
  };
}

async function analyzeMealPhoto(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "Backend nie ma ustawionego OPENAI_API_KEY w .env." });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg", mealTitle } = await readBody(req);
  if (!imageBase64 || typeof imageBase64 !== "string") {
    sendJson(res, 400, { error: "Brakuje imageBase64." });
    return;
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      text: {
        format: { type: "json_object" },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: VISION_SYSTEM_PROMPT,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserText(mealTitle),
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail: "low",
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    sendJson(res, response.status, {
      error: payload?.error?.message || "OpenAI odrzucil request.",
    });
    return;
  }

  sendJson(res, 200, { result: parseOpenAiJson(payload) });
}

loadDotEnv();

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, {
        ok: true,
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        model: MODEL,
      });
      return;
    }

    if (req.method === "POST" && req.url === "/analyze-meal-photo") {
      await analyzeMealPhoto(req, res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Nieznany blad backendu.",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ritatu OpenAI proxy listening on http://0.0.0.0:${PORT}`);
});
