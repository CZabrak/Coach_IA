"use client";

import { Clock, Dumbbell, Flame, Layers, Trophy, X } from "lucide-react";
import { formatDuration } from "@/lib/notes";

export type WorkoutSummaryData = {
  name: string;
  durationSeconds: number | null;
  exerciseCount: number;
  setCount: number;
  volume: number;
  records: { name: string; e1rm: number }[];
};

type Props = {
  summary: WorkoutSummaryData;
  onClose: () => void;
};

function Stat({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-slate-950/70 px-2 py-3">
      <Icon className="h-4 w-4 text-emerald-400" />
      <p className="text-lg font-bold tabular-nums text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export default function WorkoutSummary({ summary, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Résumé de la séance"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-800 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">Séance terminée 💪</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-slate-100">{summary.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 active:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat
            icon={Clock}
            value={summary.durationSeconds ? formatDuration(summary.durationSeconds) : "–"}
            label="Durée"
          />
          <Stat icon={Dumbbell} value={String(summary.exerciseCount)} label="Exercices" />
          <Stat icon={Layers} value={String(summary.setCount)} label="Séries" />
          <Stat icon={Flame} value={Math.round(summary.volume).toLocaleString("fr-CA")} label="Volume (lbs)" />
        </div>

        {summary.records.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
              <Trophy className="h-4 w-4" />
              {summary.records.length === 1 ? "1 record battu" : `${summary.records.length} records battus`}
            </p>
            <ul className="mt-2 space-y-1">
              {summary.records.map((record) => (
                <li key={record.name} className="flex justify-between gap-3 text-xs text-slate-200">
                  <span className="truncate">{record.name}</span>
                  <span className="shrink-0 tabular-nums text-amber-200">
                    1RM ~{Math.round(record.e1rm * 10) / 10} lbs
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-2xl bg-emerald-500 text-sm font-semibold text-emerald-950 active:scale-[0.98]"
        >
          Parfait
        </button>
      </div>
    </div>
  );
}
