"use client";

import { FolderKanban, Loader2 } from "lucide-react";
import type { WorkoutTemplate } from "@/lib/types";

type Props = {
  templates: WorkoutTemplate[];
  selectedProgram: string;
  activeTemplateId: string;
  loadingDayId: string | null;
  onSelectProgram: (name: string) => void;
  onLoadDay: (template: WorkoutTemplate) => void;
};

export const DEFAULT_PROGRAM = "Programme Principal";

export default function ProgramsPanel({
  templates,
  selectedProgram,
  activeTemplateId,
  loadingDayId,
  onSelectProgram,
  onLoadDay,
}: Props) {
  const programNames = Array.from(new Set(templates.map((t) => t.program_name || DEFAULT_PROGRAM)));
  const days = templates
    .filter((t) => (t.program_name || DEFAULT_PROGRAM) === selectedProgram)
    .sort((a, b) => (a.day_number || 1) - (b.day_number || 1));

  if (programNames.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-800 py-12 text-center">
        <FolderKanban className="h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-400">Aucun programme enregistré.</p>
        <p className="px-6 text-xs text-slate-500">
          Demande au Coach IA de créer un programme, ou enregistre ta séance depuis l&apos;onglet Séance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="program" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Programme ({programNames.length})
        </label>
        <select
          id="program"
          value={selectedProgram}
          onChange={(e) => onSelectProgram(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-emerald-500/40 bg-slate-950 px-3 text-base font-semibold text-emerald-300"
        >
          {programNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const active = activeTemplateId === day.id;
          const loading = loadingDayId === day.id;
          return (
            <button
              key={day.id}
              onClick={() => onLoadDay(day)}
              disabled={loadingDayId !== null}
              className={`w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.99] disabled:opacity-70 ${
                active
                  ? "border-emerald-500 bg-emerald-950/30"
                  : "border-slate-800 bg-slate-900/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                  Jour {day.day_number || 1}
                </span>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
                {active && !loading && <span className="text-[11px] text-emerald-400">Chargé</span>}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-100">{day.name}</p>
              {day.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{day.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
