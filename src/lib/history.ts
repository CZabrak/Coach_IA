import { decodeMeta } from "@/lib/notes";
import type { RecentWorkout } from "@/lib/types";

export type PastSet = { set_number: number; weight: number; reps: number; rpe: number };

export type LastPerformance = {
  date: string;
  sets: PastSet[];
  note: string;
};

// L'historique est trié du plus récent au plus ancien.
export function lastPerformance(
  history: RecentWorkout[],
  exerciseId: string,
): LastPerformance | null {
  for (const workout of history) {
    const sets = workout.workout_sets
      .filter((s) => s.exercise_id === exerciseId)
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({
        set_number: s.set_number,
        weight: Number(s.weight),
        reps: Number(s.reps),
        rpe: Number(s.rpe),
      }));
    if (sets.length > 0) {
      const note = decodeMeta(workout.notes).exerciseNotes[exerciseId] ?? "";
      return { date: workout.date || workout.created_at, sets, note };
    }
  }
  return null;
}

export const REP_MIN = 8;
export const REP_MAX = 12;

// Formule d'Epley, limitée aux séries de 12 reps ou moins pour rester fiable.
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + Math.min(reps, 12) / 30);
}

export function bestHistoricalE1RM(history: RecentWorkout[], exerciseId: string): number {
  let best = 0;
  for (const workout of history) {
    for (const s of workout.workout_sets) {
      if (s.exercise_id === exerciseId) {
        best = Math.max(best, estimate1RM(Number(s.weight), Number(s.reps)));
      }
    }
  }
  return best;
}

export type Suggestion = {
  weight: number;
  reps: number;
  rpe: number;
  label: string;
};

// Double progression : on monte les reps jusqu'à REP_MAX, puis on augmente la charge.
export function suggestProgression(last: LastPerformance, step = 5): Suggestion | null {
  const working = last.sets.filter((s) => s.weight > 0);
  if (working.length === 0) return null;
  const weight = Math.max(...working.map((s) => s.weight));
  const atWeight = working.filter((s) => s.weight === weight);
  const minReps = Math.min(...atWeight.map((s) => s.reps));
  const avgRpe = atWeight.reduce((sum, s) => sum + s.rpe, 0) / atWeight.length;

  if (minReps >= REP_MAX && avgRpe <= 9) {
    return {
      weight: weight + step,
      reps: REP_MIN,
      rpe: 8,
      label: `Objectif atteint : passe à ${formatWeight(weight + step)} lbs × ${REP_MIN}`,
    };
  }
  if (avgRpe >= 9.5) {
    return {
      weight,
      reps: minReps,
      rpe: 8,
      label: `Séance dure : refais ${formatWeight(weight)} lbs × ${minReps} avec plus de marge`,
    };
  }
  const target = Math.min(minReps + 1, REP_MAX);
  return {
    weight,
    reps: target,
    rpe: 8,
    label: `Vise ${formatWeight(weight)} lbs × ${target} (+1 rep)`,
  };
}

export function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function relativeDay(date: string): string {
  const day = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  if (Number.isNaN(day.getTime())) return "";
  const startOfToday = new Date();
  startOfToday.setHours(12, 0, 0, 0);
  const diff = Math.round((startOfToday.getTime() - day.getTime()) / 86_400_000);
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  if (diff < 14) return `il y a ${diff} j`;
  if (diff < 60) return `il y a ${Math.round(diff / 7)} sem.`;
  return `il y a ${Math.round(diff / 30)} mois`;
}
