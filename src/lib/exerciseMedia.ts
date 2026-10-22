export type MediaEntry = {
  id: string;
  name: string;
  images: string[];
  instructions: string[];
};

export const MEDIA_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const SYNONYMS: Record<string, string> = {
  fly: "fly",
  flye: "fly",
  flyes: "fly",
  flies: "fly",
  "pec deck": "butterfly",
  "pull up": "pullup",
  "chin up": "chinup",
  "push up": "pushup",
  "sit up": "situp",
  "step up": "stepup",
  "face pull": "facepull",
  crossover: "crossover",
  overhead: "overhead",
  ohp: "shoulder press",
  "overhead barbell press": "barbell shoulder press",
  "overhead press": "shoulder press",
  "military press": "shoulder press",
  rdl: "romanian deadlift",
  "lateral raise": "side lateral raise",
};

const STOP = new Set([
  "a", "the", "of", "with", "deux", "bras", "un", "machine", "pronation", "supination",
  "medium", "grip", "high", "low", "to", "and", "focused",
]);

function stem(token: string) {
  if (token.length > 4 && token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(raw: string): string[] {
  let text = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [from, to] of Object.entries(SYNONYMS)) {
    if (text.includes(from)) text = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  return text
    .split(" ")
    .filter((t) => t && !STOP.has(t))
    .map(stem);
}

const EQUIPMENT = new Set(["barbell", "dumbbell", "cable"]);

const MODIFIERS = new Set([
  "rear", "lying", "seated", "standing", "incline", "decline", "romanian", "stiff", "sumo",
  "bulgarian", "front", "reverse", "close", "wide", "overhead", "single", "one",
  "ez", "bench", "hammer", "preacher", "goblet", "wrist", "leg", "tricep", "bicep", "kettlebell", "inner", "supine",
]);

export function findBestMatch(name: string, db: MediaEntry[]): MediaEntry | null {
  const query = tokenize(name);
  if (query.length === 0) return null;
  const querySet = new Set(query);

  let best: MediaEntry | null = null;
  let bestScore = 0;
  for (const entry of db) {
    const candidate = tokenize(entry.name);
    if (candidate.length === 0) continue;
    const candSet = new Set(candidate);
    let hits = 0;
    for (const t of querySet) if (candSet.has(t)) hits++;
    if (hits === 0) continue;

    let missing = 0;
    for (const t of querySet) if (!candSet.has(t)) { if (MODIFIERS.has(t)) missing += 0.3; else if (EQUIPMENT.has(t)) missing += 0.1; }
    let extra = 0;
    for (const t of candSet) if (!querySet.has(t)) { if (MODIFIERS.has(t)) extra += 0.2; else if (EQUIPMENT.has(t)) extra += 0.1; }

    const recall = hits / querySet.size;
    const precision = hits / candSet.size;
    const score = recall * 0.7 + precision * 0.3 - missing - extra;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 0.55 ? best : null;
}
