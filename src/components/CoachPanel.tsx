"use client";

import { useRef, useState } from "react";
import { Bot, Download, Loader2, Save, Send, Sparkles } from "lucide-react";
import { buildCoachContext } from "@/lib/coachContext";
import type {
  CoachDay,
  CoachResponse,
  Exercise,
  InjuryLog,
  Location,
  RecentWorkout,
  SetEntry,
  WorkoutTemplate,
} from "@/lib/types";

type Message =
  | { role: "user"; text: string }
  | { role: "coach"; text: string; programName?: string; days: CoachDay[]; followUps?: string[] };

// Rendu minimal du markdown produit par le coach : listes "- " et **gras**.
function CoachText({ text }: { text: string }) {
  const renderInline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-slate-50">
          {part.slice(2, -2)}
        </strong>
      ) : part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((raw, i) => {
        const line = raw.trim();
        if (!line) return null;
        if (/^[-•*]\s+/.test(line)) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="text-indigo-400">•</span>
              <span>{renderInline(line.replace(/^[-•*]\s+/, ""))}</span>
            </p>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

type Props = {
  exercises: Exercise[];
  location: Location;
  currentSets: SetEntry[];
  history: RecentWorkout[];
  injuries: InjuryLog[];
  templates: WorkoutTemplate[];
  onLoadDay: (day: CoachDay, programName?: string) => void;
  onSaveProgram: (programName: string, days: CoachDay[]) => Promise<boolean>;
};

const SUGGESTIONS = [
  "Analyse mon volume par muscle cette semaine et dis-moi quoi corriger",
  "Crée-moi un programme PPL 3 jours en supersets qui respecte mes blessures",
  "Adapte la séance à l'écran avec ma progression de charges",
  "Qu'est-ce qui stagne dans mes dernières séances ?",
];

export default function CoachPanel({
  exercises,
  location,
  currentSets,
  history,
  injuries,
  templates,
  onLoadDay,
  onSaveProgram,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  async function saveProgram(index: number, programName: string, days: CoachDay[]) {
    setSavingIndex(index);
    const ok = await onSaveProgram(programName, days);
    setSavingIndex(null);
    if (ok) setSavedIndexes((current) => [...current, index]);
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || pending) return;
    setInput("");
    const conversation = messages.slice(-8).map((m) =>
      m.role === "user"
        ? { role: "user" as const, text: m.text }
        : {
            role: "coach" as const,
            text:
              m.days.length > 0
                ? `${m.text}\n[Séances proposées : ${m.days.map((d) => d.dayName).join(" ; ")}]`
                : m.text,
          },
    );
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setPending(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          location,
          exercises,
          conversation,
          currentSets: currentSets.map(({ exercise_id, exercise_name, set_number, weight, reps, rpe }) => ({
            exercise_id,
            exercise_name,
            set_number,
            weight,
            reps,
            rpe,
          })),
          context: buildCoachContext(history, exercises, injuries, templates),
        }),
      });
      const data = (await response.json()) as CoachResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Le coach est indisponible.");
      }
      const validIds = new Set(exercises.map((e) => e.id));
      const days = (data.days ?? [])
        .map((day) => ({ ...day, sets: day.sets.filter((s) => validIds.has(s.exercise_id)) }))
        .filter((day) => day.sets.length > 0);
      setMessages((m) => [
        ...m,
        { role: "coach", text: data.explanation ?? "Voici ma proposition.", programName: data.programName, days, followUps: data.followUps?.slice(0, 3) },
      ]);
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Impossible de joindre le coach (connexion perdue ?)."
          : error instanceof Error
            ? error.message
            : "Erreur inconnue.";
      setMessages((m) => [...m, { role: "coach", text: message, days: [] }]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="mb-3 flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-sm font-semibold">Ton coach personnel</h2>
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Il connaît ton historique, ton lieu ({location}) et ton catalogue de {exercises.length} exercices.
          </p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => send(suggestion)}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left text-sm text-slate-200 active:bg-slate-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((message, index) =>
        message.role === "user" ? (
          <div
            key={index}
            className="ml-8 self-end rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-sm text-white animate-slide-up"
          >
            {message.text}
          </div>
        ) : (
          <div key={index} className="mr-4 flex gap-2 animate-slide-up">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
              <Bot className="h-4 w-4 text-indigo-300" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm leading-relaxed text-slate-200">
                <CoachText text={message.text} />
              </div>
              {message.programName && message.days.length > 0 && (
                <p className="px-1 text-xs font-semibold text-indigo-300">{message.programName}</p>
              )}
              {message.days.map((day) => (
                <div key={day.dayNumber} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                  <p className="text-sm font-semibold text-slate-100">{day.dayName}</p>
                  {day.description && <p className="mt-0.5 text-xs text-slate-400">{day.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">{day.sets.length} séries</p>
                  <button
                    onClick={() => onLoadDay(day, message.programName)}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500/20 py-2.5 text-sm font-medium text-indigo-200 active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" /> Charger dans ma séance
                  </button>
                </div>
              ))}
              {message.days.length > 0 && (
                <button
                  onClick={() =>
                    void saveProgram(index, message.programName || "Programme IA", message.days)
                  }
                  disabled={savingIndex !== null || savedIndexes.includes(index)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-emerald-950 active:scale-[0.98] disabled:opacity-50"
                >
                  {savingIndex === index ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savedIndexes.includes(index)
                    ? "Programme enregistré"
                    : `Enregistrer le programme (${message.days.length} jour${message.days.length > 1 ? "s" : ""})`}
                </button>
              )}
              {index === messages.length - 1 && !pending && message.followUps && message.followUps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {message.followUps.map((f) => (
                    <button
                      key={f}
                      onClick={() => void send(f)}
                      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-200 active:bg-indigo-500/20"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      )}

      {pending && (
        <div className="flex items-center gap-2 px-2 text-xs text-slate-400" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Le coach réfléchit…
        </div>
      )}
      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 backdrop-blur"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Demande une séance, une analyse…"
          aria-label="Message au coach"
          className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Envoyer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
