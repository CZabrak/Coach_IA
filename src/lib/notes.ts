export type WorkoutMeta = {
  note: string;
  duration: number | null;
  exerciseNotes: Record<string, string>;
};

const EMPTY: WorkoutMeta = { note: "", duration: null, exerciseNotes: {} };

// Les métadonnées sont stockées dans la colonne texte `workouts.notes` : du JSON versionné,
// avec repli sur du texte brut pour les anciennes séances.
export function encodeMeta(meta: WorkoutMeta): string | null {
  const exerciseNotes = Object.fromEntries(
    Object.entries(meta.exerciseNotes)
      .map(([id, text]) => [id, text.trim()])
      .filter(([, text]) => text),
  );
  const note = meta.note.trim();
  if (!note && !meta.duration && Object.keys(exerciseNotes).length === 0) return null;
  return JSON.stringify({ v: 1, note, duration: meta.duration, exerciseNotes });
}

export function decodeMeta(raw: string | null | undefined): WorkoutMeta {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkoutMeta> & { v?: number };
    if (parsed && typeof parsed === "object" && parsed.v === 1) {
      return {
        note: typeof parsed.note === "string" ? parsed.note : "",
        duration: typeof parsed.duration === "number" ? parsed.duration : null,
        exerciseNotes: parsed.exerciseNotes ?? {},
      };
    }
  } catch {
    // texte brut d'une ancienne séance
  }
  return { ...EMPTY, note: raw };
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}
