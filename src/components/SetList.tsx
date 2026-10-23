"use client";

import { useState } from "react";
import { Check, Copy, ImageIcon, Layers, Trash2 } from "lucide-react";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import Stepper from "@/components/Stepper";
import { formatWeight, lastPerformance, relativeDay } from "@/lib/history";
import type { RecentWorkout, SetEntry } from "@/lib/types";

type Props = {
  sets: SetEntry[];
  history: RecentWorkout[];
  onUpdate: <K extends keyof SetEntry>(tempId: string, field: K, value: SetEntry[K]) => void;
  onToggleDone: (tempId: string) => void;
  onRemove: (tempId: string) => void;
  onDuplicate: (tempId: string) => void;
};

export default function SetList({ sets, history, onUpdate, onToggleDone, onRemove, onDuplicate }: Props) {
  const [shown, setShown] = useState<Set<string>>(new Set());
  const toggleMedia = (id: string) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const groups: { exerciseId: string; name: string; sets: SetEntry[] }[] = [];
  for (const set of sets) {
    const existing = groups.find((g) => g.exerciseId === set.exercise_id);
    if (existing) existing.sets.push(set);
    else groups.push({ exerciseId: set.exercise_id, name: set.exercise_name, sets: [set] });
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 py-10 text-center">
        <Layers className="h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-400">Aucune série pour le moment.</p>
        <p className="px-6 text-xs text-slate-500">
          Choisis un exercice ci-dessus, ou demande une séance au Coach IA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const doneCount = group.sets.filter((s) => s.done).length;
        return (
          <article
            key={group.exerciseId}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 animate-slide-up"
          >
            <header className="mb-2 flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-100">{group.name}</h3>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => toggleMedia(group.exerciseId)}
                  aria-label={`Voir l'illustration de ${group.name}`}
                  aria-pressed={shown.has(group.exerciseId)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    shown.has(group.exerciseId)
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-500 active:bg-slate-800"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                  {doneCount}/{group.sets.length}
                </span>
              </div>
            </header>

            {shown.has(group.exerciseId) && (
              <div className="mb-2">
                <ExerciseMedia name={group.name} />
              </div>
            )}

            {(() => {
              const last = lastPerformance(history, group.exerciseId);
              if (!last) {
                return (
                  <p className="mb-2 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-slate-500">
                    Première fois : pas d&apos;historique pour cet exercice.
                  </p>
                );
              }
              const summary = last.sets
                .map((s) => `${formatWeight(s.weight)}×${s.reps}`)
                .join(" · ");
              const apply = () => {
                group.sets.forEach((set, index) => {
                  const past = last.sets[index] ?? last.sets[last.sets.length - 1];
                  onUpdate(set.tempId, "weight", past.weight);
                  onUpdate(set.tempId, "reps", past.reps);
                  onUpdate(set.tempId, "rpe", past.rpe);
                });
              };
              return (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-indigo-500/10 px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-300/80">
                      Dernière fois · {relativeDay(last.date)}
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-200">{summary} kg×reps</p>
                  </div>
                  <button
                    onClick={apply}
                    className="h-8 shrink-0 rounded-lg bg-indigo-500/20 px-3 text-xs font-semibold text-indigo-200 active:bg-indigo-500/30"
                  >
                    Reprendre
                  </button>
                </div>
              );
            })()}

            <div className="space-y-2">
              {group.sets.map((set) => (
                <div
                  key={set.tempId}
                  className={`rounded-xl border p-2.5 transition ${
                    set.done
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">Série {set.set_number}</span>
                      <input
                        type="text"
                        value={set.superset_group}
                        onChange={(e) => onUpdate(set.tempId, "superset_group", e.target.value)}
                        placeholder="Superset"
                        aria-label="Groupe de superset"
                        maxLength={4}
                        className="h-7 w-20 rounded-lg border border-slate-800 bg-slate-900 px-2 text-center text-xs text-indigo-300 placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onDuplicate(set.tempId)}
                        aria-label="Dupliquer la série"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 active:bg-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onRemove(set.tempId)}
                        aria-label="Supprimer la série"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 active:bg-slate-800 active:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                    <Stepper
                      label="Poids (lbs)"
                      value={set.weight}
                      step={5}
                      onChange={(v) => onUpdate(set.tempId, "weight", v)}
                    />
                    <Stepper
                      label="Reps"
                      value={set.reps}
                      step={1}
                      onChange={(v) => onUpdate(set.tempId, "reps", v)}
                    />
                    <Stepper
                      label="RPE"
                      value={set.rpe}
                      step={0.5}
                      max={10}
                      onChange={(v) => onUpdate(set.tempId, "rpe", v)}
                    />
                    <button
                      onClick={() => onToggleDone(set.tempId)}
                      aria-pressed={set.done}
                      aria-label={set.done ? "Série terminée, annuler" : "Valider la série"}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition active:scale-95 ${
                        set.done
                          ? "border-emerald-400 bg-emerald-500 text-emerald-950"
                          : "border-slate-700 bg-slate-900 text-slate-500"
                      }`}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
