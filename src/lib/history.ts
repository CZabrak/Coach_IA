import type { RecentWorkout } from "@/lib/types";

export type PastSet = { set_number: number; weight: number; reps: number; rpe: number };

export type LastPerformance = {
  date: string;
  sets: PastSet[];
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
    if (sets.length > 0) return { date: workout.date || workout.created_at, sets };
  }
  return null;
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
