import { estimate1RM } from "@/lib/history";
import { decodeMeta } from "@/lib/notes";
import type { Exercise, InjuryLog, RecentWorkout, WorkoutTemplate } from "@/lib/types";

const DAY_MS = 86_400_000;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function dateOf(workout: RecentWorkout) {
  return new Date(workout.created_at || workout.date).getTime();
}

type ExerciseStats = {
  exercice: string;
  muscle: string;
  seances: number;
  derniere_seance: string;
  derniere_serie_top: string;
  meilleur_1RM_estime: number;
  tendance_1RM: "hausse" | "stable" | "baisse" | "n/a";
  derniere_note?: string;
};

// Résume l'historique brut en indicateurs exploitables : le modèle raisonne mieux sur des tendances que sur 15 séances en JSON.
export function buildCoachContext(
  history: RecentWorkout[],
  exercises: Exercise[],
  injuries: InjuryLog[],
  templates: WorkoutTemplate[],
) {
  const now = Date.now();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const sorted = [...history].sort((a, b) => dateOf(b) - dateOf(a));

  const perExercise = new Map<string, { date: number; top: { w: number; r: number; rpe: number }; e1rm: number }[]>();
  const setsByMuscle7 = new Map<string, number>();
  const setsByMuscle28 = new Map<string, number>();
  const notesByExercise = new Map<string, string>();

  for (const workout of sorted) {
    const when = dateOf(workout);
    const age = now - when;
    const meta = decodeMeta(workout.notes);
    const groups = new Map<string, typeof workout.workout_sets>();
    for (const s of workout.workout_sets) {
      const list = groups.get(s.exercise_id) ?? [];
      list.push(s);
      groups.set(s.exercise_id, list);
      const muscle = byId.get(s.exercise_id)?.muscle_group ?? "Autre";
      if (age <= 7 * DAY_MS) setsByMuscle7.set(muscle, (setsByMuscle7.get(muscle) ?? 0) + 1);
      if (age <= 28 * DAY_MS) setsByMuscle28.set(muscle, (setsByMuscle28.get(muscle) ?? 0) + 1);
    }
    for (const [id, sets] of groups) {
      let top = { w: 0, r: 0, rpe: 0, e: 0 };
      for (const s of sets) {
        const e = estimate1RM(Number(s.weight), Number(s.reps));
        if (e >= top.e) top = { w: Number(s.weight), r: Number(s.reps), rpe: Number(s.rpe), e };
      }
      const list = perExercise.get(id) ?? [];
      list.push({ date: when, top: { w: top.w, r: top.r, rpe: top.rpe }, e1rm: top.e });
      perExercise.set(id, list);
      const note = meta.exerciseNotes[id];
      if (note && !notesByExercise.has(id)) notesByExercise.set(id, note);
    }
  }

  const stats: ExerciseStats[] = [];
  for (const [id, entries] of perExercise) {
    const ex = byId.get(id);
    const latest = entries[0];
    const oldest = entries[entries.length - 1];
    let trend: ExerciseStats["tendance_1RM"] = "n/a";
    if (entries.length >= 2 && oldest.e1rm > 0) {
      const delta = (latest.e1rm - oldest.e1rm) / oldest.e1rm;
      trend = delta > 0.03 ? "hausse" : delta < -0.03 ? "baisse" : "stable";
    }
    stats.push({
      exercice: ex?.name ?? id,
      muscle: ex?.muscle_group ?? "?",
      seances: entries.length,
      derniere_seance: new Date(latest.date).toISOString().slice(0, 10),
      derniere_serie_top: `${latest.top.w} lbs × ${latest.top.r} @RPE ${latest.top.rpe}`,
      meilleur_1RM_estime: round1(Math.max(...entries.map((e) => e.e1rm))),
      tendance_1RM: trend,
      derniere_note: notesByExercise.get(id),
    });
  }
  stats.sort((a, b) => b.seances - a.seances);

  const recent = sorted.slice(0, 6).map((w) => {
    const meta = decodeMeta(w.notes);
    return {
      date: (w.date || w.created_at).slice(0, 10),
      nom: w.name,
      lieu: w.location,
      duree_min: meta.duration ? Math.round(meta.duration / 60) : undefined,
      series: w.workout_sets.length,
      note: meta.note || undefined,
    };
  });

  const last4Weeks = sorted.filter((w) => now - dateOf(w) <= 28 * DAY_MS).length;
  const toObject = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));

  return {
    resume: {
      seances_enregistrees: history.length,
      derniere_seance: recent[0]?.date ?? null,
      seances_par_semaine_4_sem: round1(last4Weeks / 4),
      series_par_muscle_7_jours: toObject(setsByMuscle7),
      series_par_muscle_28_jours_total: toObject(setsByMuscle28),
    },
    blessures_actives: injuries
      .filter((i) => i.status === "Actif")
      .map((i) => ({ zone: i.body_part, detail: i.description })),
    blessures_gueries: injuries
      .filter((i) => i.status !== "Actif")
      .map((i) => ({ zone: i.body_part, statut: i.status })),
    exercices_pratiques: stats.slice(0, 40),
    dernieres_seances: recent,
    programmes_enregistres: templates.map((t) => ({
      programme: t.program_name,
      jour: t.day_number,
      nom: t.name,
      description: t.description,
    })),
  };
}
