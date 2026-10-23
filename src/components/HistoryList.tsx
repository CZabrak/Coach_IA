"use client";

import { Calendar, Clock, History, RotateCcw, StickyNote } from "lucide-react";
import { decodeMeta, formatDuration } from "@/lib/notes";
import { relOne, type RecentWorkout } from "@/lib/types";

type Props = {
  workouts: RecentWorkout[];
  loading: boolean;
  onRepeat: (workout: RecentWorkout) => void;
};

function summarize(workout: RecentWorkout) {
  const byExercise = new Map<string, { name: string; sets: string[] }>();
  for (const set of workout.workout_sets) {
    const entry = byExercise.get(set.exercise_id) ?? {
      name: relOne(set.exercises)?.name ?? "Exercice",
      sets: [],
    };
    entry.sets.push(`${set.weight}×${set.reps}`);
    byExercise.set(set.exercise_id, entry);
  }
  return [...byExercise.values()];
}

export default function HistoryList({ workouts, loading, onRepeat }: Props) {
  if (loading && workouts.length === 0) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900" />
        ))}
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 py-12 text-center">
        <History className="h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-400">Aucune séance enregistrée.</p>
        <p className="px-6 text-xs text-slate-500">Termine ta première séance pour la retrouver ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => {
        const exercises = summarize(workout);
        const meta = decodeMeta(workout.notes);
        return (
          <article key={workout.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-emerald-400">{workout.name}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {workout.date} · {workout.location}
                  </span>
                  {meta.duration ? (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(meta.duration)}
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                onClick={() => onRepeat(workout)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Refaire
              </button>
            </header>
            <ul className="mt-3 space-y-1.5">
              {exercises.map((exercise) => (
                <li
                  key={exercise.name}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate text-slate-200">{exercise.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{exercise.sets.join("  ")}</span>
                </li>
              ))}
            </ul>
            {meta.note && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-100">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                {meta.note}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
