// Lowercase and strip diacritics. "ł" has no Unicode decomposition, so it needs
// its own replace: "Łosoś" -> "losos".
export const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

const splitWords = (text: string) => text.split(/[^a-z0-9]+/).filter(Boolean);

// Single letters are Polish prepositions ("z", "w", "i") and would match anything.
export const tokenize = (query: string) => splitWords(normalize(query)).filter((t) => t.length > 1);

// A token matches a substring of the name, or a name word it inflects:
// "kurczaka" still finds "Kurczak, pierś".
const tokenMatches = (name: string, words: string[], token: string) =>
  name.includes(token) || words.some((w) => w.length >= 4 && token.startsWith(w));

export const countMatches = (name: string, tokens: string[]) => {
  const n = normalize(name);
  const words = splitWords(n);
  return tokens.filter((t) => tokenMatches(n, words, t)).length;
};

// 0 unless every token matches. Higher is better: the whole name, a name
// prefix, every token starting a word, then a plain substring.
export const matchScore = (name: string, tokens: string[]) => {
  if (tokens.length === 0 || countMatches(name, tokens) < tokens.length) return 0;
  const n = normalize(name);
  const q = tokens.join(" ");
  if (splitWords(n).join(" ") === q) return 4;
  if (n.startsWith(q)) return 3;
  const words = splitWords(n);
  return tokens.every((t) => words.some((w) => w.startsWith(t))) ? 2 : 1;
};
