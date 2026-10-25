export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  sub_target: string;
  equipment: string;
  mechanics: string;
};

export type SetEntry = {
  tempId: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  superset_group: string;
  weight: number;
  reps: number;
  rpe: number;
  done: boolean;
};

// PostgREST renvoie un objet pour une relation many-to-one, mais les types inférés sont des tableaux.
export type Rel<T> = T | T[] | null;

export function relOne<T>(rel: Rel<T> | undefined): T | undefined {
  return Array.isArray(rel) ? rel[0] : (rel ?? undefined);
}

export type HistorySet = {
  exercise_id: string;
  set_number: number;
  superset_group: string | null;
  weight: number;
  reps: number;
  rpe: number;
  exercises: Rel<{ name: string }>;
};

export type WorkoutTemplate = {
  id: string;
  program_name: string;
  day_number: number;
  name: string;
  description: string;
};

export type TemplateExerciseRow = {
  set_number: number;
  superset_group: string | null;
  target_reps: number;
  target_rpe: number;
  exercises: Rel<{ id: string; name: string }>;
};

export type InjuryLog = {
  id: string;
  body_part: string;
  description: string;
  status: string;
  created_at: string;
};

export type RecentWorkout = {
  id: string;
  date: string;
  created_at: string;
  name: string;
  location: string;
  notes?: string | null;
  workout_sets: HistorySet[];
};

export type Location = "Maison" | "Gym";

export type CoachSet = {
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  superset_group?: string;
  weight: number;
  reps: number;
  rpe: number;
};

export type CoachDay = {
  dayNumber: number;
  dayName: string;
  description?: string;
  sets: CoachSet[];
};

export type CoachResponse = {
  programName?: string;
  explanation?: string;
  followUps?: string[];
  days?: CoachDay[];
  error?: string;
};
