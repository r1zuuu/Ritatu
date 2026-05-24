import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.PORT || 8787);
const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const MAX_BODY_BYTES = 16 * 1024 * 1024;

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
    estimated_weight_g: Number(parsed.estimated_weight_g || 100),
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
    protein_per_100g: Number(parsed.protein_per_100g || 0),
    carbs_per_100g: Number(parsed.carbs_per_100g || 0),
    fat_per_100g: Number(parsed.fat_per_100g || 0),
    note: parsed.note == null ? null : String(parsed.note),
  };
}

async function analyzeMealPhoto(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "Backend nie ma ustawionego OPENAI_API_KEY w .env." });
    return;
  }

  const { imageBase64, mimeType = "image/jpeg" } = await readBody(req);
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
              text: "You are a nutrition analysis assistant. Always respond with valid JSON only. No markdown, no explanation.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                'Analyze this meal photo and estimate its nutritional content per 100g.\nReturn ONLY this JSON:\n{\n  "dish_name": "string (in Polish)",\n  "estimated_weight_g": number,\n  "confidence": "low|medium|high",\n  "protein_per_100g": number,\n  "carbs_per_100g": number,\n  "fat_per_100g": number,\n  "note": "string or null"\n}\n\nBe conservative with estimates. If you cannot identify the dish, set confidence to "low".',
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
