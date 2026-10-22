"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Dumbbell,
  FolderKanban,
  History,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadJSON, removeKey, saveJSON } from "@/lib/storage";
import { useRestTimer } from "@/lib/useRestTimer";
import {
  relOne,
  type CoachDay,
  type Exercise,
  type InjuryLog,
  type Location,
  type RecentWorkout,
  type SetEntry,
  type TemplateExerciseRow,
  type WorkoutTemplate,
} from "@/lib/types";
import SetList from "@/components/SetList";
import StatsWidgets from "@/components/StatsWidgets";
import HistoryList from "@/components/HistoryList";
import CoachPanel from "@/components/CoachPanel";
import ProgramsPanel, { DEFAULT_PROGRAM } from "@/components/ProgramsPanel";
import InjuryPanel from "@/components/InjuryPanel";
import RestTimer from "@/components/RestTimer";

type Tab = "session" | "programs" | "coach" | "history";
type Draft = {
  workoutName: string;
  programTitle: string;
  dayNumber: number;
  activeTemplateId: string;
  location: Location;
  sets: SetEntry[];
};
type Cache = {
  exercises: Exercise[];
  workouts: RecentWorkout[];
  templates?: WorkoutTemplate[];
  injuries?: InjuryLog[];
};
type Toast = { id: number; message: string; tone: "success" | "error" | "info" };

const DRAFT_KEY = "coach-ia:draft";
const CACHE_KEY = "coach-ia:cache";
const DEFAULT_NAME = "Séance du jour";
const TABS_IDS: Tab[] = ["session", "programs", "coach", "history"];

const TABS: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
  { id: "session", label: "Séance", icon: Dumbbell },
  { id: "programs", label: "Programmes", icon: FolderKanban },
  { id: "coach", label: "Coach IA", icon: Sparkles },
  { id: "history", label: "Historique", icon: History },
];

const inputClass =
  "mt-1 h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-base text-slate-100";

export default function WorkoutApp() {
  const timer = useRestTimer();

  const [tab, setTab] = useState<Tab>("session");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [injuries, setInjuries] = useState<InjuryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingDayId, setLoadingDayId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [dayNumber, setDayNumber] = useState(1);
  const [workoutName, setWorkoutName] = useState(DEFAULT_NAME);
  const [location, setLocation] = useState<Location>("Gym");
  const [selectedMuscle, setSelectedMuscle] = useState("Tous");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [sets, setSets] = useState<SetEntry[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDataError(null);
    const errors: string[] = [];
    const next: Cache = { exercises: [], workouts: [], templates: [], injuries: [] };
    let complete = true;

    try {
      const [ex, tmpl, wk, inj] = await Promise.all([
        supabase
          .from("exercises")
          .select("*")
          .order("muscle_group", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("workout_templates")
          .select("*")
          .order("program_name", { ascending: true })
          .order("day_number", { ascending: true }),
        supabase
          .from("workouts")
          .select(
            `id, date, created_at, name, location,
             workout_sets ( exercise_id, set_number, superset_group, weight, reps, rpe, exercises ( name ) )`,
          )
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("injury_logs").select("*").order("created_at", { ascending: false }),
      ]);

      if (ex.error) errors.push(ex.error.message);
      else if (ex.data) {
        next.exercises = ex.data;
        setExercises(ex.data);
      }
      if (tmpl.error) errors.push(tmpl.error.message);
      else if (tmpl.data) {
        next.templates = tmpl.data;
        setTemplates(tmpl.data);
      }
      if (wk.error) errors.push(wk.error.message);
      else if (wk.data) {
        next.workouts = wk.data;
        setRecentWorkouts(wk.data);
      }
      if (inj.error) errors.push(inj.error.message);
      else if (inj.data) {
        next.injuries = inj.data;
        setInjuries(inj.data);
      }
      complete = errors.length === 0;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      complete = false;
    }

    if (complete) {
      saveJSON(CACHE_KEY, next satisfies Cache);
    } else {
      const cache = loadJSON<Cache | null>(CACHE_KEY, null);
      if (cache) {
        setExercises((c) => (c.length ? c : cache.exercises));
        setRecentWorkouts((c) => (c.length ? c : cache.workouts));
        setTemplates((c) => (c.length ? c : (cache.templates ?? [])));
        setInjuries((c) => (c.length ? c : (cache.injuries ?? [])));
      }
      setDataError(errors[0] ?? "Erreur inconnue");
    }
    setLoading(false);
  }, []);

  // Premier chargement : brouillon, cache, raccourcis (?tab=) puis données distantes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const draft = loadJSON<Draft | null>(DRAFT_KEY, null);
    if (draft) {
      setWorkoutName(draft.workoutName);
      setProgramTitle(draft.programTitle ?? "");
      setDayNumber(draft.dayNumber ?? 1);
      setActiveTemplateId(draft.activeTemplateId ?? "");
      setLocation(draft.location);
      setSets(draft.sets);
    }
    setDraftLoaded(true);
    setNowMs(Date.now());
    setOnline(navigator.onLine);

    const cache = loadJSON<Cache | null>(CACHE_KEY, null);
    if (cache) {
      setExercises(cache.exercises);
      setRecentWorkouts(cache.workouts);
      setTemplates(cache.templates ?? []);
      setInjuries(cache.injuries ?? []);
      setLoading(false);
    }

    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (TABS_IDS.includes(requestedTab as Tab)) setTab(requestedTab as Tab);
    /* eslint-enable react-hooks/set-state-in-effect */

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Le raccourci "Repos 90 s" de l'icône démarre directement le minuteur
  const { start: startTimer } = timer;
  useEffect(() => {
    const seconds = Number(new URLSearchParams(window.location.search).get("timer"));
    if (seconds > 0) {
      startTimer(Math.min(seconds, 600));
      window.history.replaceState(null, "", "/");
    }
  }, [startTimer]);

  useEffect(() => {
    if (!online) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    void fetchData();
  }, [online, fetchData]);

  useEffect(() => {
    if (!selectedExerciseId && exercises.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId]);

  // Programme affiché par défaut : le premier disponible
  useEffect(() => {
    if (templates.length === 0) return;
    const names = templates.map((t) => t.program_name || DEFAULT_PROGRAM);
    if (!selectedProgram || !names.includes(selectedProgram)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProgram(names[0]);
    }
  }, [templates, selectedProgram]);

  // Brouillon local : rien n'est perdu si l'app est fermée en pleine séance
  useEffect(() => {
    if (!draftLoaded) return;
    if (sets.length === 0 && workoutName === DEFAULT_NAME && !programTitle) removeKey(DRAFT_KEY);
    else {
      saveJSON(DRAFT_KEY, {
        workoutName,
        programTitle,
        dayNumber,
        activeTemplateId,
        location,
        sets,
      } satisfies Draft);
    }
  }, [draftLoaded, workoutName, programTitle, dayNumber, activeTemplateId, location, sets]);

  const filteredExercises = useMemo(
    () =>
      exercises.filter((ex) => {
        const matchLocation =
          location === "Gym" || ex.equipment === "Dumbbell" || ex.equipment === "Bodyweight";
        const matchMuscle = selectedMuscle === "Tous" || ex.muscle_group === selectedMuscle;
        return matchLocation && matchMuscle;
      }),
    [exercises, location, selectedMuscle],
  );

  const muscleGroups = useMemo(
    () => ["Tous", ...Array.from(new Set(exercises.map((e) => e.muscle_group)))],
    [exercises],
  );

  const selectedExercise =
    filteredExercises.find((e) => e.id === selectedExerciseId) ?? filteredExercises[0];

  // Dernier poids utilisé pour un exercice, d'après l'historique
  function lastWeightFor(exerciseId: string): number {
    for (const workout of recentWorkouts) {
      const found = workout.workout_sets.find(
        (s) => s.exercise_id === exerciseId && Number(s.weight) > 0,
      );
      if (found) return Number(found.weight);
    }
    return 30;
  }

  function addSet() {
    if (!selectedExercise) return;
    const existing = sets.filter((s) => s.exercise_id === selectedExercise.id);
    const last = existing[existing.length - 1];
    setSets([
      ...sets,
      {
        tempId: crypto.randomUUID(),
        exercise_id: selectedExercise.id,
        exercise_name: selectedExercise.name,
        set_number: existing.length + 1,
        superset_group: last ? last.superset_group : "A1",
        weight: last ? last.weight : lastWeightFor(selectedExercise.id),
        reps: last ? last.reps : 10,
        rpe: last ? last.rpe : 8,
        done: false,
      },
    ]);
  }

  function updateSet<K extends keyof SetEntry>(tempId: string, field: K, value: SetEntry[K]) {
    setSets((current) => current.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s)));
  }

  function renumber(list: SetEntry[]) {
    const counters = new Map<string, number>();
    return list.map((s) => {
      const next = (counters.get(s.exercise_id) ?? 0) + 1;
      counters.set(s.exercise_id, next);
      return { ...s, set_number: next };
    });
  }

  function removeSet(tempId: string) {
    setSets((current) => renumber(current.filter((s) => s.tempId !== tempId)));
  }

  function duplicateSet(tempId: string) {
    setSets((current) => {
      const index = current.findIndex((s) => s.tempId === tempId);
      if (index === -1) return current;
      const copy = { ...current[index], tempId: crypto.randomUUID(), done: false };
      return renumber([...current.slice(0, index + 1), copy, ...current.slice(index + 1)]);
    });
  }

  function toggleDone(tempId: string) {
    const target = sets.find((s) => s.tempId === tempId);
    if (!target) return;
    updateSet(tempId, "done", !target.done);
    if (!target.done) {
      if (typeof navigator.vibrate === "function") navigator.vibrate(15);
      timer.start(timer.defaultRest);
    }
  }

  async function loadTemplateDay(template: WorkoutTemplate) {
    setLoadingDayId(template.id);
    const { data, error } = await supabase
      .from("template_exercises")
      .select("set_number, superset_group, target_reps, target_rpe, order_index, exercises ( id, name )")
      .eq("template_id", template.id)
      .order("order_index", { ascending: true });
    setLoadingDayId(null);

    if (error || !data) {
      notify(`Chargement impossible : ${error?.message ?? "inconnu"}`, "error");
      return;
    }

    const rows = data as unknown as TemplateExerciseRow[];
    setSets(
      rows.map<SetEntry>((row) => {
        const exercise = relOne(row.exercises);
        const id = exercise?.id ?? "";
        return {
          tempId: crypto.randomUUID(),
          exercise_id: id,
          exercise_name: exercise?.name ?? "Exercice",
          set_number: row.set_number,
          superset_group: row.superset_group ?? "",
          weight: lastWeightFor(id),
          reps: row.target_reps,
          rpe: row.target_rpe,
          done: false,
        };
      }),
    );
    setActiveTemplateId(template.id);
    setProgramTitle(template.program_name || DEFAULT_PROGRAM);
    setWorkoutName(template.name);
    setDayNumber(template.day_number || 1);
    setTab("session");
    notify(`« ${template.name} » chargé`, "success");
  }

  function loadCoachDay(day: CoachDay, programName?: string) {
    const known = new Map(exercises.map((e) => [e.id, e.name]));
    setSets(
      day.sets.map<SetEntry>((s) => ({
        tempId: crypto.randomUUID(),
        exercise_id: s.exercise_id,
        exercise_name: known.get(s.exercise_id) ?? s.exercise_name,
        set_number: Number(s.set_number) || 1,
        superset_group: s.superset_group || "A1",
        weight: Number(s.weight) || lastWeightFor(s.exercise_id),
        reps: Number(s.reps) || 10,
        rpe: Number(s.rpe) || 8,
        done: false,
      })),
    );
    setActiveTemplateId("");
    if (programName) setProgramTitle(programName);
    setWorkoutName(day.dayName);
    setDayNumber(day.dayNumber || 1);
    setTab("session");
    notify(`« ${day.dayName} » chargée`, "success");
  }

  function repeatWorkout(workout: RecentWorkout) {
    setSets(
      renumber(
        workout.workout_sets.map<SetEntry>((s) => ({
          tempId: crypto.randomUUID(),
          exercise_id: s.exercise_id,
          exercise_name: relOne(s.exercises)?.name ?? "Exercice",
          set_number: s.set_number,
          superset_group: s.superset_group ?? "",
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          done: false,
        })),
      ),
    );
    setActiveTemplateId("");
    setWorkoutName(workout.name);
    setLocation(workout.location === "Maison" ? "Maison" : "Gym");
    setTab("session");
    notify("Séance rechargée, bonne séance !", "success");
  }

  function clearSession() {
    if (sets.length > 0 && !window.confirm("Vider la séance en cours ?")) return;
    setSets([]);
    setWorkoutName(DEFAULT_NAME);
    setProgramTitle("");
    setActiveTemplateId("");
  }

  const doneCount = sets.filter((s) => s.done).length;
  const setsToSave = doneCount > 0 ? sets.filter((s) => s.done) : sets;

  async function saveWorkout() {
    if (setsToSave.length === 0) {
      notify("Ajoute au moins une série avant de sauvegarder.", "error");
      return;
    }
    setSaving(true);
    try {
      const baseName = workoutName.trim() || DEFAULT_NAME;
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert([{ name: programTitle ? `${programTitle} - ${baseName}` : baseName, location }])
        .select()
        .single();
      if (workoutError || !workout) throw new Error(workoutError?.message ?? "Séance non créée.");

      const { error: setsError } = await supabase.from("workout_sets").insert(
        setsToSave.map((s) => ({
          workout_id: workout.id,
          exercise_id: s.exercise_id,
          set_number: s.set_number,
          superset_group: s.superset_group || null,
          weight: Number(s.weight),
          reps: Number(s.reps),
          rpe: Number(s.rpe),
        })),
      );
      if (setsError) throw new Error(setsError.message);

      setSets([]);
      setWorkoutName(DEFAULT_NAME);
      setProgramTitle("");
      setActiveTemplateId("");
      timer.stop();
      notify("Séance enregistrée 💪", "success");
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      notify(`Sauvegarde impossible : ${message}. Ta séance reste sur cet appareil.`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function insertTemplate(
    program: string,
    day: number,
    name: string,
    description: string,
    rows: {
      exercise_id: string;
      set_number: number;
      superset_group: string | null;
      reps: number;
      rpe: number;
    }[],
  ) {
    const { data: template, error } = await supabase
      .from("workout_templates")
      .insert([{ program_name: program, day_number: day, name, description }])
      .select()
      .single();
    if (error || !template) throw new Error(error?.message ?? "Jour non créé.");

    const { error: rowsError } = await supabase.from("template_exercises").insert(
      rows.map((r, index) => ({
        template_id: template.id,
        exercise_id: r.exercise_id,
        set_number: r.set_number,
        superset_group: r.superset_group,
        target_reps: r.reps,
        target_rpe: r.rpe,
        order_index: index + 1,
      })),
    );
    if (rowsError) throw new Error(rowsError.message);
  }

  async function saveCurrentAsTemplate() {
    if (sets.length === 0) {
      notify("Aucune série à enregistrer.", "error");
      return;
    }
    setSavingTemplate(true);
    try {
      const program = programTitle.trim() || DEFAULT_PROGRAM;
      await insertTemplate(
        program,
        dayNumber,
        workoutName.trim() || DEFAULT_NAME,
        "Séance personnalisée",
        sets.map((s) => ({
          exercise_id: s.exercise_id,
          set_number: s.set_number,
          superset_group: s.superset_group || null,
          reps: Number(s.reps),
          rpe: Number(s.rpe),
        })),
      );
      setSelectedProgram(program);
      notify(`« ${workoutName} » ajouté au programme « ${program} »`, "success");
      await fetchData();
    } catch (error) {
      notify(`Enregistrement impossible : ${error instanceof Error ? error.message : "inconnu"}`, "error");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function saveCoachProgram(programName: string, days: CoachDay[]) {
    try {
      for (const day of days) {
        await insertTemplate(
          programName,
          day.dayNumber || 1,
          day.dayName,
          day.description || "Généré par Coach IA",
          day.sets.map((s) => ({
            exercise_id: s.exercise_id,
            set_number: Number(s.set_number) || 1,
            superset_group: s.superset_group || "A1",
            reps: Number(s.reps) || 10,
            rpe: Number(s.rpe) || 8,
          })),
        );
      }
      setSelectedProgram(programName);
      notify(`Programme « ${programName} » enregistré (${days.length} jour${days.length > 1 ? "s" : ""})`, "success");
      await fetchData();
      return true;
    } catch (error) {
      notify(`Enregistrement impossible : ${error instanceof Error ? error.message : "inconnu"}`, "error");
      await fetchData();
      return false;
    }
  }

  async function addInjury(bodyPart: string, description: string) {
    const { error } = await supabase
      .from("injury_logs")
      .insert([{ body_part: bodyPart, description, status: "Actif" }]);
    if (error) {
      notify(`Impossible d'enregistrer : ${error.message}`, "error");
      return false;
    }
    await fetchData();
    return true;
  }

  async function toggleInjury(injury: InjuryLog) {
    const { error } = await supabase
      .from("injury_logs")
      .update({ status: injury.status === "Actif" ? "Guéri" : "Actif" })
      .eq("id", injury.id);
    if (error) notify(`Mise à jour impossible : ${error.message}`, "error");
    await fetchData();
  }

  const status = dataError ? "error" : online ? "ok" : "offline";
  const programCount = new Set(templates.map((t) => t.program_name || DEFAULT_PROGRAM)).size;
  const activeInjuries = injuries.filter((i) => i.status === "Actif").length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
              <Dumbbell className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">Coach IA</h1>
              <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    status === "ok" ? "bg-emerald-400" : status === "offline" ? "bg-amber-400" : "bg-rose-400"
                  }`}
                />
                {status === "ok"
                  ? `${programCount} programme${programCount > 1 ? "s" : ""} · ${recentWorkouts.length} séances · ${activeInjuries} blessure${activeInjuries > 1 ? "s" : ""}`
                  : status === "offline"
                    ? "Hors ligne"
                    : "Synchronisation impossible"}
              </p>
            </div>
          </div>
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            aria-label="Actualiser les données"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-300 active:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-48 pt-4">
        {dataError && (
          <div role="alert" className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 text-amber-100">
              <p className="font-semibold">Base de données inaccessible</p>
              <p className="mt-0.5 break-words text-xs text-amber-200/80">
                {dataError}. Les dernières données connues sont affichées et ta séance est sauvegardée
                localement.
              </p>
              <button
                onClick={() => void fetchData()}
                className="mt-2 rounded-lg bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        <div hidden={tab !== "session"} className="space-y-4">
          <StatsWidgets
            workouts={recentWorkouts}
            nowMs={nowMs}
            currentDone={doneCount}
            currentTotal={sets.length}
          />

          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="grid grid-cols-[1fr_5.5rem] gap-3">
              <div>
                <label htmlFor="program-title" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Programme
                </label>
                <input
                  id="program-title"
                  type="text"
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                  placeholder="Optionnel"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="day-number" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jour
                </label>
                <input
                  id="day-number"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Math.max(1, Number(e.target.value) || 1))}
                  className={`${inputClass} text-center`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="workout-name" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nom de la séance
              </label>
              <input
                id="workout-name"
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div role="group" aria-label="Lieu" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
              {(
                [
                  ["Maison", Home, "Maison (haltères)"],
                  ["Gym", Building2, "Gym complet"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  onClick={() => setLocation(value)}
                  aria-pressed={location === value}
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition ${
                    location === value
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50"
                      : "text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-slate-800 pt-4">
              <div>
                <label htmlFor="muscle" className="text-xs text-slate-400">
                  Groupe musculaire
                </label>
                <select
                  id="muscle"
                  value={selectedMuscle}
                  onChange={(e) => {
                    setSelectedMuscle(e.target.value);
                    setSelectedExerciseId("");
                  }}
                  className={inputClass}
                >
                  {muscleGroups.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="exercise" className="text-xs text-slate-400">
                  Exercice ({filteredExercises.length} disponibles)
                </label>
                <select
                  id="exercise"
                  value={selectedExercise?.id ?? ""}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  disabled={filteredExercises.length === 0}
                  className={inputClass}
                >
                  {filteredExercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                      {ex.sub_target ? ` (${ex.sub_target})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addSet}
                disabled={!selectedExercise}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-emerald-950 transition active:scale-[0.98] disabled:opacity-40"
              >
                <Plus className="h-5 w-5" /> Ajouter une série
              </button>
            </div>
          </section>

          <section aria-label="Séries en cours" className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-300">
                Séance en cours <span className="text-slate-500">({sets.length})</span>
              </h2>
              {sets.length > 0 && (
                <button
                  onClick={clearSession}
                  className="flex items-center gap-1 text-xs text-slate-500 active:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Vider
                </button>
              )}
            </div>

            <SetList
              sets={sets}
              onUpdate={updateSet}
              onToggleDone={toggleDone}
              onRemove={removeSet}
              onDuplicate={duplicateSet}
            />

            {sets.length > 0 && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={saveWorkout}
                  disabled={saving}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-emerald-950 shadow-lg shadow-emerald-900/30 transition active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {saving ? "Enregistrement…" : "Terminer et enregistrer"}
                </button>
                <p className="text-center text-xs text-slate-500">
                  {doneCount > 0
                    ? `${doneCount} série${doneCount > 1 ? "s" : ""} validée${doneCount > 1 ? "s" : ""} seront enregistrées.`
                    : "Aucune série validée : toutes les séries seront enregistrées."}
                </p>
                <button
                  onClick={saveCurrentAsTemplate}
                  disabled={savingTemplate}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 text-sm font-medium text-slate-200 active:bg-slate-800 disabled:opacity-60"
                >
                  {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer comme jour de programme
                </button>
              </div>
            )}
          </section>
        </div>

        <div hidden={tab !== "programs"} className="space-y-3">
          <ProgramsPanel
            templates={templates}
            selectedProgram={selectedProgram}
            activeTemplateId={activeTemplateId}
            loadingDayId={loadingDayId}
            onSelectProgram={setSelectedProgram}
            onLoadDay={loadTemplateDay}
          />
        </div>

        <div hidden={tab !== "coach"} className="space-y-3">
          <InjuryPanel injuries={injuries} onAdd={addInjury} onToggle={toggleInjury} />
          <CoachPanel
            exercises={exercises}
            location={location}
            currentSets={sets}
            history={recentWorkouts}
            injuries={injuries}
            templates={templates}
            onLoadDay={loadCoachDay}
            onSaveProgram={saveCoachProgram}
          />
        </div>

        <div hidden={tab !== "history"} className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-slate-300">Historique récent</h2>
          <HistoryList workouts={recentWorkouts} loading={loading} onRepeat={repeatWorkout} />
        </div>
      </main>

      <RestTimer timer={timer} />

      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-xl animate-slide-up ${
            toast.tone === "success"
              ? "border-emerald-500/40 bg-emerald-950/95 text-emerald-100"
              : toast.tone === "error"
                ? "border-rose-500/40 bg-rose-950/95 text-rose-100"
                : "border-slate-700 bg-slate-900/95 text-slate-100"
          }`}
        >
          {toast.message}
        </div>
      )}

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div role="tablist" className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                tab === id ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
