"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Exercise } from "@/lib/types";

type Props = {
  current: { id: string; name: string };
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

export default function ReplaceExerciseSheet({ current, exercises, onPick, onClose }: Props) {
  const currentMeta = exercises.find((e) => e.id === current.id);
  const [query, setQuery] = useState("");
  const [sameGroup, setSameGroup] = useState(Boolean(currentMeta));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => e.id !== current.id)
      .filter((e) => !sameGroup || !currentMeta || e.muscle_group === currentMeta.muscle_group)
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sameTarget = (x: Exercise) => (currentMeta && x.sub_target === currentMeta.sub_target ? 0 : 1);
        return sameTarget(a) - sameTarget(b) || a.name.localeCompare(b.name);
      })
      .slice(0, 60);
  }, [exercises, current.id, currentMeta, query, sameGroup]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Remplacer ${current.name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80dvh] w-full max-w-xl flex-col rounded-t-3xl border border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Remplacer</p>
            <h2 className="truncate text-base font-semibold text-slate-100">{current.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 active:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-4 py-3">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un exercice"
              className="h-full flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </label>
          {currentMeta && (
            <button
              onClick={() => setSameGroup((v) => !v)}
              aria-pressed={sameGroup}
              className={`h-8 rounded-full px-3 text-xs font-medium ${
                sameGroup ? "bg-indigo-500/20 text-indigo-200" : "bg-slate-800 text-slate-400"
              }`}
            >
              Même groupe : {currentMeta.muscle_group}
            </button>
          )}
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {results.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">Aucun exercice trouvé.</li>
          )}
          {results.map((exercise) => (
            <li key={exercise.id}>
              <button
                onClick={() => onPick(exercise)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left active:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-100">{exercise.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {exercise.muscle_group} · {exercise.sub_target}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                  {exercise.equipment}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
