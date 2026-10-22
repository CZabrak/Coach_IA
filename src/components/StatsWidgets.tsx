"use client";

import { Activity, CalendarCheck, Flame } from "lucide-react";
import type { RecentWorkout } from "@/lib/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Props = {
  workouts: RecentWorkout[];
  nowMs: number | null;
  currentDone: number;
  currentTotal: number;
};

function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold leading-none tabular-nums text-white">{value}</p>
      <p className="mt-1 truncate text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

export default function StatsWidgets({ workouts, nowMs, currentDone, currentTotal }: Props) {
  const weekly =
    nowMs === null
      ? []
      : workouts.filter((w) => nowMs - new Date(w.created_at ?? w.date).getTime() <= WEEK_MS);

  const volume = weekly.reduce(
    (sum, w) => sum + w.workout_sets.reduce((s, st) => s + st.weight * st.reps, 0),
    0,
  );

  return (
    <section aria-label="Statistiques" className="grid grid-cols-3 gap-2">
      <Card
        icon={<CalendarCheck className="h-3.5 w-3.5 text-emerald-400" />}
        label="7 jours"
        value={String(weekly.length)}
        hint={weekly.length > 1 ? "séances" : "séance"}
      />
      <Card
        icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
        label="Volume"
        value={volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : String(Math.round(volume))}
        hint="lbs soulevées"
      />
      <Card
        icon={<Activity className="h-3.5 w-3.5 text-indigo-400" />}
        label="En cours"
        value={`${currentDone}/${currentTotal}`}
        hint="séries faites"
      />
    </section>
  );
}
