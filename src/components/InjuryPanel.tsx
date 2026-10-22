"use client";

import { useState } from "react";
import { ChevronDown, HeartPulse } from "lucide-react";
import type { InjuryLog } from "@/lib/types";

type Props = {
  injuries: InjuryLog[];
  onAdd: (bodyPart: string, description: string) => Promise<boolean>;
  onToggle: (injury: InjuryLog) => void;
};

export default function InjuryPanel({ injuries, onAdd, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState("");
  const [desc, setDesc] = useState("");
  const active = injuries.filter((i) => i.status === "Actif").length;

  async function submit() {
    if (!part.trim() || !desc.trim()) return;
    if (await onAdd(part.trim(), desc.trim())) {
      setPart("");
      setDesc("");
    }
  }

  const field =
    "h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-600";

  return (
    <section className="rounded-2xl border border-rose-500/20 bg-slate-900/80">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-3.5"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
          <HeartPulse className="h-4 w-4" /> Dossier kiné · {active} active{active > 1 ? "s" : ""}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-800 p-3.5">
          {injuries.length === 0 && (
            <p className="text-xs text-slate-500">Aucune blessure enregistrée. Le coach en tiendra compte.</p>
          )}
          {injuries.map((injury) => (
            <div
              key={injury.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs"
            >
              <div className="min-w-0">
                <span
                  className={`mr-2 rounded px-2 py-0.5 font-bold ${
                    injury.status === "Actif"
                      ? "border border-rose-500/30 bg-rose-500/20 text-rose-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {injury.status}
                </span>
                <strong className="text-slate-100">{injury.body_part} :</strong>{" "}
                <span className="text-slate-400">{injury.description}</span>
              </div>
              <button
                onClick={() => onToggle(injury)}
                className="h-9 shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-[11px] text-slate-300 active:bg-slate-800"
              >
                {injury.status === "Actif" ? "Guéri" : "Réactiver"}
              </button>
            </div>
          ))}

          <div className="space-y-2">
            <input
              value={part}
              onChange={(e) => setPart(e.target.value)}
              placeholder="Zone (ex : Épaule droite)"
              aria-label="Zone blessée"
              className={field}
            />
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Détails (ex : douleur en supination)"
              aria-label="Détails de la blessure"
              className={field}
            />
            <button
              onClick={() => void submit()}
              disabled={!part.trim() || !desc.trim()}
              className="h-11 w-full rounded-xl bg-rose-600/80 text-sm font-semibold text-white disabled:opacity-40"
            >
              Mémoriser la blessure
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
