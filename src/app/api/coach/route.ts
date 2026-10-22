import { NextResponse } from "next/server";

type CatalogExercise = {
  id: string;
  name: string;
  muscle_group: string;
  sub_target: string;
  equipment: string;
};

type CoachRequest = {
  prompt?: string;
  location?: "Maison" | "Gym";
  exercises?: CatalogExercise[];
  currentSets?: unknown[];
  workoutHistory?: unknown[];
  injuries?: unknown[];
  templates?: unknown[];
};

const MODEL = "gemini-2.5-flash";

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
    }));

  return `
Tu es le Coach IA personnel de l'athlète (Physiothérapeute du sport, Analyste de performance, Architecte de programmes).
Réponds toujours en français.

=== MÉMOIRE LONG TERME DE L'ATHLÈTE ===
1. DOSSIER PHYSIOTHÉRAPIE & BLESSURES :
${JSON.stringify(body.injuries ?? [])}

2. HISTORIQUE DES SÉANCES PASSÉES (Poids en lbs, Reps, RPE) :
${JSON.stringify(body.workoutHistory ?? [])}

3. PROGRAMMES MULTI-JOURS ENREGISTRÉS :
${JSON.stringify(body.templates ?? [])}

4. SÉANCE ACTUELLEMENT À L'ÉCRAN :
${JSON.stringify(body.currentSets ?? [])}

5. LIEU : ${location}
======================================================

CATALOGUE D'EXERCICES DISPONIBLES (UTILISE UNIQUEMENT CES "id" EXACTS) :
${JSON.stringify(catalog)}

FONCTIONNEMENT DES PROGRAMMES :
Un Programme ("programName") contient un ou plusieurs Jours ("days").
- Si l'athlète demande de créer un NOUVEAU PROGRAMME complet, génère tous les jours dans le tableau "days".
- S'il demande d'adapter/créer une seule séance, mets 1 seul jour dans "days".
- S'il pose une simple question ou demande une analyse sans modifier les exercices, renvoie "days": [].
- Dans chaque jour, alterne les supersets dans l'ordre d'exécution : A1 (set 1), A2 (set 1), A1 (set 2), A2 (set 2), etc.

RÈGLE DE SORTIE STRICTE (JSON valide uniquement) :
{
  "programName": "Nom du programme global",
  "explanation": "Analyse kiné, biomécanique, justification du programme et références à l'historique",
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Jour 1 : Push & Stabilité Scapulaire",
      "description": "Focus pectoraux et épaules",
      "sets": [
        {
          "exercise_id": "UUID_EXACT_DU_CATALOGUE",
          "exercise_name": "Nom exact de l'exercice",
          "set_number": 1,
          "superset_group": "A1",
          "weight": 35,
          "reps": 10,
          "rpe": 8.0
        }
      ]
    }
  ]
}`;
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildInstruction(body) }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur du service Gemini." },
        { status: 502 },
      );
    }

    const rawText: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: "Réponse vide du coach IA." }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(rawText));
  } catch (error) {
    const message = error instanceof Error ? error.message : "inconnue";
    return NextResponse.json({ error: `Erreur serveur IA : ${message}` }, { status: 500 });
  }
}
