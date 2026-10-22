"use client";

import { Check, Copy, Layers, Trash2 } from "lucide-react";
import Stepper from "@/components/Stepper";
import type { SetEntry } from "@/lib/types";

type Props = {
  sets: SetEntry[];
  onUpdate: <K extends keyof SetEntry>(tempId: string, field: K, value: SetEntry[K]) => void;
  onToggleDone: (tempId: string) => void;
  onRemove: (tempId: string) => void;
  onDuplicate: (tempId: string) => void;
};

export default function SetList({ sets, onUpdate, onToggleDone, onRemove, onDuplicate }: Props) {
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
              <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                {doneCount}/{group.sets.length}
              </span>
            </header>

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
