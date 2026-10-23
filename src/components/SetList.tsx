"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ImageIcon,
  Layers,
  MoreHorizontal,
  Repeat2,
  SkipForward,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import ReplaceExerciseSheet from "@/components/ReplaceExerciseSheet";
import Stepper from "@/components/Stepper";
import {
  bestHistoricalE1RM,
  estimate1RM,
  formatWeight,
  lastPerformance,
  relativeDay,
  suggestProgression,
} from "@/lib/history";
import type { Exercise, RecentWorkout, SetEntry } from "@/lib/types";

type Props = {
  sets: SetEntry[];
  history: RecentWorkout[];
  exercises: Exercise[];
  onMoveExercise: (exerciseId: string, direction: -1 | 1) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onReplaceExercise: (exerciseId: string, replacement: Exercise) => void;
  exerciseNotes: Record<string, string>;
  onExerciseNote: (exerciseId: string, text: string) => void;
  onUpdate: <K extends keyof SetEntry>(tempId: string, field: K, value: SetEntry[K]) => void;
  onToggleDone: (tempId: string) => void;
  onRemove: (tempId: string) => void;
  onDuplicate: (tempId: string) => void;
};

export default function SetList({
  sets,
  history,
  exercises,
  onMoveExercise,
  onRemoveExercise,
  onReplaceExercise,
  exerciseNotes,
  onExerciseNote,
  onUpdate,
  onToggleDone,
  onRemove,
  onDuplicate,
}: Props) {
  const [menu, setMenu] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
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
      {groups.map((group, groupIndex) => {
        const doneCount = group.sets.filter((s) => s.done).length;
        const bestE1RM = bestHistoricalE1RM(history, group.exerciseId);
        const hasHistory = bestE1RM > 0;
        const menuOpen = menu === group.exerciseId;
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
                <button
                  onClick={() => setMenu(menuOpen ? null : group.exerciseId)}
                  aria-label={`Actions pour ${group.name}`}
                  aria-expanded={menuOpen}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    menuOpen ? "bg-slate-700 text-slate-100" : "text-slate-500 active:bg-slate-800"
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </header>

            {menuOpen && (
              <div className="mb-2 grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => onMoveExercise(group.exerciseId, -1)}
                  disabled={groupIndex === 0}
                  className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-950/70 text-[10px] text-slate-300 active:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" /> Monter
                </button>
                <button
                  onClick={() => onMoveExercise(group.exerciseId, 1)}
                  disabled={groupIndex === groups.length - 1}
                  className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-950/70 text-[10px] text-slate-300 active:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" /> Descendre
                </button>
                <button
                  onClick={() => {
                    setReplacing(group.exerciseId);
                    setMenu(null);
                  }}
                  className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-indigo-500/15 text-[10px] text-indigo-200 active:bg-indigo-500/25"
                >
                  <Repeat2 className="h-4 w-4" /> Remplacer
                </button>
                <button
                  onClick={() => {
                    onRemoveExercise(group.exerciseId);
                    setMenu(null);
                  }}
                  className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-rose-500/10 text-[10px] text-rose-300 active:bg-rose-500/20"
                >
                  <SkipForward className="h-4 w-4" /> Passer
                </button>
              </div>
            )}

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
              const suggestion = suggestProgression(last);
              const applySuggestion = () => {
                if (!suggestion) return;
                group.sets.forEach((set) => {
                  onUpdate(set.tempId, "weight", suggestion.weight);
                  onUpdate(set.tempId, "reps", suggestion.reps);
                  onUpdate(set.tempId, "rpe", suggestion.rpe);
                });
              };
              return (
                <div className="mb-2 space-y-1.5">
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-2.5 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-300/80">
                        Dernière fois · {relativeDay(last.date)}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-200">{summary} lbs×reps</p>
                    </div>
                    <button
                      onClick={apply}
                      className="h-8 shrink-0 rounded-lg bg-indigo-500/20 px-3 text-xs font-semibold text-indigo-200 active:bg-indigo-500/30"
                    >
                      Reprendre
                    </button>
                  </div>
                  {last.note && (
                    <p className="rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Ta note : </span>
                      {last.note}
                    </p>
                  )}
                  {suggestion && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
                      <TrendingUp className="h-4 w-4 shrink-0 text-amber-300" />
                      <p className="min-w-0 flex-1 text-xs font-medium text-amber-100">{suggestion.label}</p>
                      <button
                        onClick={applySuggestion}
                        className="h-8 shrink-0 rounded-lg bg-amber-500/20 px-3 text-xs font-semibold text-amber-200 active:bg-amber-500/30"
                      >
                        Appliquer
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-2">
              {group.sets.map((set) => {
                const isRecord =
                  set.done && hasHistory && estimate1RM(set.weight, set.reps) > bestE1RM + 0.01;
                return (
                <div
                  key={set.tempId}
                  className={`rounded-xl border p-2.5 transition ${
                    isRecord
                      ? "border-amber-400/50 bg-amber-400/5"
                      : set.done
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-slate-800 bg-slate-950/60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">Série {set.set_number}</span>
                      {isRecord && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <Trophy className="h-3 w-3" /> Record · 1RM ~{formatWeight(Math.round(estimate1RM(set.weight, set.reps) * 10) / 10)} lbs
                        </span>
                      )}
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
                );
              })}
            </div>
            <input
              type="text"
              value={exerciseNotes[group.exerciseId] ?? ""}
              onChange={(e) => onExerciseNote(group.exerciseId, e.target.value)}
              maxLength={200}
              placeholder="Note (sensations, douleur, réglages…)"
              aria-label={`Note pour ${group.name}`}
              className="mt-2 h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-200 placeholder:text-slate-600"
            />
          </article>
        );
      })}
      {replacing && (
        <ReplaceExerciseSheet
          current={{
            id: replacing,
            name: groups.find((g) => g.exerciseId === replacing)?.name ?? "",
          }}
          exercises={exercises}
          onPick={(exercise) => {
            onReplaceExercise(replacing, exercise);
            setReplacing(null);
          }}
          onClose={() => setReplacing(null)}
        />
      )}
    </div>
  );
}
