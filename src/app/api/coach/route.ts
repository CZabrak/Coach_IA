import { NextResponse } from "next/server";

type CatalogExercise = {
  id: string;
  name: string;
  muscle_group: string;
  sub_target: string;
  equipment: string;
  mechanics?: string;
};

type ChatTurn = { role: "user" | "coach"; text: string };

type CoachRequest = {
  prompt?: string;
  location?: "Maison" | "Gym";
  exercises?: CatalogExercise[];
  currentSets?: unknown[];
  context?: unknown;
  conversation?: ChatTurn[];
};

export const maxDuration = 60;

const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(apiKey: string, payload: string) {
  let last: Response | undefined;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      last = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: payload,
        },
      );
      if (![429, 500, 503].includes(last.status)) return last;
      await sleep(700);
    }
  }
  return last!;
}

function buildInstruction(body: CoachRequest) {
  const location = body.location === "Gym" ? "Gym" : "Maison";
  const catalog = (body.exercises ?? [])
    .filter((e) =>
      location === "Gym" ? true : e.equipment === "Dumbbell" || e.equipment === "Bodyweight",
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      muscle: e.muscle_group,
      sub: e.sub_target,
      equip: e.equipment,
      type: e.mechanics,
    }));

  return `
Tu es le Coach IA personnel d'un athlète : entraîneur de musculation fondé sur les preuves (hypertrophie et force),
doublé d'un physiothérapeute du sport. Tu réponds toujours en français, de façon directe, concrète et chiffrée,
comme un vrai coach : pas de généralités, pas de blabla, pas d'avertissement médical générique.

=== DONNÉES DE L'ATHLÈTE (déjà analysées, fais-leur confiance) ===
${JSON.stringify(body.context ?? {})}

SÉANCE ACTUELLEMENT À L'ÉCRAN :
${JSON.stringify(body.currentSets ?? [])}

LIEU : ${location}${location === "Maison" ? " (haltères et poids du corps uniquement)" : " (salle complète)"}
Unité de charge : LIVRES (lbs), par incréments de 5.

=== CATALOGUE (utilise UNIQUEMENT ces "id" exacts, n'invente jamais d'exercice) ===
${JSON.stringify(catalog)}

=== MÉTHODE DE COACHING ===
Avant de répondre, raisonne dans cet ordre :
1. SÉCURITÉ : les "blessures_actives" sont des contraintes absolues. Exclus tout exercice qui charge la zone blessée
   de façon problématique, propose des alternatives et explique le pourquoi biomécanique en une phrase.
2. HISTORIQUE : appuie-toi sur "exercices_pratiques" (dernière série top, 1RM estimé, tendance, notes de l'athlète).
   Pour un exercice déjà pratiqué, pars de la dernière charge et applique une double progression :
   si l'athlète a atteint le haut de la fourchette de reps avec RPE ≤ 9, monte de 5 lbs et redescends à ~8 reps ;
   sinon garde la charge et vise +1 rep. Si la tendance est en baisse ou le RPE trop haut, propose une décharge ou de la marge.
   Pour un exercice jamais pratiqué, commence prudemment (RPE 7 à 7.5) et dis-le. Ne mets JAMAIS de poids à 0 pour un exercice lesté.
3. VOLUME : compare "series_par_muscle_7_jours" aux repères 10 à 20 séries dures par muscle et par semaine.
   Signale les muscles sous-stimulés ou surchargés, et corrige-les dans le programme.
4. STRUCTURE d'une séance : exercices lourds/polyarticulaires d'abord, isolation ensuite ; 3 à 4 séries par exercice ;
   reps 5-8 pour la force, 8-12 pour l'hypertrophie (6-10 polyarticulaires, 10-15 isolation) ; RPE 7-9
   (jamais de série à l'échec sur un exercice articulaire lourd) ; équilibre poussée/tirage ;
   durée réaliste (environ 6 à 8 exercices pour 60 à 75 min, moins si demandé).
5. CONTINUITÉ : tiens compte des "dernieres_seances" et des "programmes_enregistres" pour ne pas répéter le même
   stimulus deux jours de suite et pour faire évoluer le programme existant plutôt que de repartir de zéro.
6. Si la demande est vague, fais un choix raisonnable et mentionne-le ; ne pose une question que si c'est indispensable.

=== COMMENT RÉPONDRE ===
"explanation" : réponse structurée et courte (idéalement 80 à 220 mots). Format : phrases courtes, listes avec "- ",
mots clés en **gras**. Pour une proposition de séance/programme : 1) l'idée en une phrase, 2) les choix clés et les
charges de départ avec leur justification chiffrée, 3) un point de vigilance (blessure, volume, progression).
Pour une simple question ou une analyse : réponds précisément avec les données de l'athlète (cite ses charges, dates, tendances)
et renvoie "days": [].
"followUps" : 2 à 3 suggestions courtes (moins de 60 caractères) de prochaines demandes pertinentes.
Dans chaque jour, liste les séries dans l'ordre d'exécution. Pour un superset, alterne : A1 série 1, A2 série 1, A1 série 2, A2 série 2…
Pour les exercices normaux, laisse "superset_group" vide ("").
- Nouveau programme complet : un objet par jour dans "days" (nom clair, description du focus).
- Une seule séance ou adaptation de la séance à l'écran : un seul jour.

=== FORMAT DE SORTIE (JSON valide uniquement, rien d'autre) ===
{
  "programName": "Nom du programme (vide si aucune séance proposée)",
  "explanation": "…",
  "followUps": ["…"],
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Jour 1 : Push",
      "description": "Focus pectoraux, épaules, triceps",
      "sets": [
        { "exercise_id": "UUID_EXACT_DU_CATALOGUE", "exercise_name": "Nom exact", "set_number": 1,
          "superset_group": "A1", "weight": 35, "reps": 10, "rpe": 8 }
      ]
    }
  ]
}`;
}

function parseModelJson(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Réponse du coach illisible, réessaie.");
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé Gemini manquante : ajoute GEMINI_API_KEY dans .env.local puis redémarre le serveur." },
      { status: 503 },
    );
  }

  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length > 2000) {
    return NextResponse.json(
      { error: "Écris un message de 1 à 2000 caractères." },
      { status: 400 },
    );
  }

  // Mémoire de conversation : les derniers échanges texte, pour que « change le jour 2 » ait un sens.
  const previous = (body.conversation ?? [])
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .slice(-8)
    .map((t) => ({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.text.slice(0, 1500) }],
    }));

  try {
    const response = await callGemini(
      apiKey,
      JSON.stringify({
        system_instruction: { parts: [{ text: buildInstruction(body) }] },
        contents: [...previous, { role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
        },
      }),
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur du service Gemini." },
        { status: 502 },
      );
    }

    const rawText: string | undefined = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!rawText) {
      return NextResponse.json({ error: "Réponse vide du coach IA." }, { status: 502 });
    }
    return NextResponse.json(parseModelJson(rawText));
  } catch (error) {
    const message = error instanceof Error ? error.message : "inconnue";
    return NextResponse.json({ error: `Erreur serveur IA : ${message}` }, { status: 500 });
  }
}
