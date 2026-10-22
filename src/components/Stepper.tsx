"use client";

import { Minus, Plus } from "lucide-react";

type StepperProps = {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export default function Stepper({ label, value, step, min = 0, max = 9999, onChange }: StepperProps) {
  const clamp = (next: number) => onChange(Math.min(max, Math.max(min, round(next))));

  return (
    <div className="min-w-0">
      <span className="mb-1 block text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950">
        <button
          type="button"
          onClick={() => clamp(value - step)}
          aria-label={`Diminuer ${label}`}
          className="flex h-11 w-9 shrink-0 items-center justify-center text-slate-400 active:bg-slate-800 rounded-l-xl"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => clamp(e.target.value === "" ? 0 : Number(e.target.value))}
          onFocus={(e) => e.target.select()}
          className="h-11 w-full min-w-0 bg-transparent text-center text-base font-semibold tabular-nums text-slate-100 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => clamp(value + step)}
          aria-label={`Augmenter ${label}`}
          className="flex h-11 w-9 shrink-0 items-center justify-center text-slate-400 active:bg-slate-800 rounded-r-xl"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
