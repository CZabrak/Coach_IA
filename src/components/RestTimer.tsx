"use client";

import { useState } from "react";
import { BellRing, Check, Minus, Plus, SkipForward, Timer, X } from "lucide-react";
import type { RestTimer as RestTimerState } from "@/lib/useRestTimer";
import { formatClock } from "@/lib/storage";

const PRESETS = [30, 45, 60, 90, 120, 180];
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestTimer({ timer }: { timer: RestTimerState }) {
  const [open, setOpen] = useState(false);
  const { running, finished, remaining, progress } = timer;

  const container =
    "fixed inset-x-0 z-40 px-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] pointer-events-none";

  if (running || finished) {
    return (
      <div className={container}>
        <div
          role="timer"
          aria-live="off"
          className={`pointer-events-auto mx-auto flex max-w-md items-center gap-4 rounded-3xl border p-3 pr-4 shadow-2xl shadow-black/50 backdrop-blur-xl animate-slide-up ${
            finished
              ? "border-emerald-400/60 bg-emerald-500/20"
              : "border-slate-700 bg-slate-900/95"
          }`}
        >
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
              <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="6" className="stroke-slate-800" />
              <circle
                cx="36"
                cy="36"
                r={RADIUS}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                className={finished ? "stroke-emerald-300" : "stroke-emerald-400"}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - (finished ? 1 : progress))}
                style={{ transition: "stroke-dashoffset 0.3s linear" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center">
              {finished ? (
                <Check className="h-6 w-6 text-emerald-300" />
              ) : (
                <Timer className="h-5 w-5 text-slate-400" />
              )}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {finished ? "Repos terminé" : "Repos"}
            </p>
            <p
              className={`font-mono text-3xl font-bold leading-none tabular-nums ${
                finished ? "text-emerald-300" : "text-white"
              }`}
            >
              {finished ? "GO !" : formatClock(remaining)}
            </p>
          </div>

          {finished ? (
            <button
              onClick={timer.stop}
              aria-label="Fermer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800/80 text-slate-200 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => timer.adjust(-15)}
                aria-label="Retirer 15 secondes"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => timer.adjust(15)}
                aria-label="Ajouter 15 secondes"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={timer.stop}
                aria-label="Passer le repos"
                className="flex h-11 items-center gap-1 rounded-full bg-emerald-500 px-3.5 text-sm font-semibold text-emerald-950 active:scale-95"
              >
                <SkipForward className="h-4 w-4" /> Passer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={container}>
      <div className="mx-auto flex max-w-md flex-col items-end gap-2">
        {open && (
          <div className="pointer-events-auto w-full rounded-3xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl animate-slide-up">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Minuteur de repos</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le minuteur"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => {
                    timer.setDefaultRest(seconds);
                    timer.start(seconds);
                    setOpen(false);
                  }}
                  className={`rounded-xl border py-3 text-sm font-semibold active:scale-95 ${
                    timer.defaultRest === seconds
                      ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-700 bg-slate-800/60 text-slate-200"
                  }`}
                >
                  {formatClock(seconds)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Se lance aussi automatiquement quand tu valides une série (
              <strong className="text-slate-200">{formatClock(timer.defaultRest)}</strong>).
            </p>
            {timer.notifPermission === "default" && (
              <button
                onClick={timer.enableNotifications}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                <BellRing className="h-4 w-4 text-emerald-400" /> Me notifier à la fin du repos
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setOpen((value) => !value)}
          aria-label="Ouvrir le minuteur de repos"
          aria-expanded={open}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-900/40 active:scale-95"
        >
          <Timer className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
