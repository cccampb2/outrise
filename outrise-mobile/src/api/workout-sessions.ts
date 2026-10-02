import { apiRequest } from "./client";

export type MeasurementType =
  | "weight_reps"
  | "reps"
  | "time"
  | "distance_time"
  | "duration"
  | "intervals";

export type WorkoutSourceType = "workout" | "workout_of_the_week" | "repeat";

export type WorkoutTarget = {
  sets?: number;
  reps?: number;
  weightLbs?: number;
  distanceMiles?: number;
  timeSeconds?: number;
  workSeconds?: number;
  recoverySeconds?: number;
  rounds?: number;
};

export type PerformanceSet = {
  order: number;
  reps?: number;
  weightLbs?: number;
};

export type ActualPerformance = {
  sets: PerformanceSet[] | null;
  distanceMiles?: number;
  timeSeconds?: number;
  roundsCompleted?: number;
};

export type WorkoutSessionExercise = {
  exercise: string;
  exerciseName: string;
  measurementType: MeasurementType;
  order: number;
  skipped: boolean;
  target: WorkoutTarget;
  actual: ActualPerformance;
};

export type WorkoutSession = {
  _id: string;
  user: string;
  sourceType: WorkoutSourceType;
  workout: string | null;
  workoutOfTheWeekOccurrence: string | null;
  workoutName: string;
  exercises: WorkoutSessionExercise[];
  status: "active" | "completed" | "cancelled";
  completedAt: string | null;
  cancelledAt: string | null;
  durationSeconds: number | null;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutHistoryResponse = {
  workoutSessions: WorkoutSession[];
  pagination: {
    page: number;
    limit: number;
    totalWorkoutSessions: number;
    totalPages: number;
  };
};

export type WorkoutSessionResponse = {
  workoutSession: WorkoutSession;
};

export type ActualSetInput = {
  order: number;
  reps?: number;
  weightLbs?: number;
};

export type UpdateExerciseInput = {
  sets?: ActualSetInput[];
  distanceMiles?: number;
  timeSeconds?: number;
  roundsCompleted?: number;
};

export type UpdateExerciseResponse = {
  message: string;
  workoutSession: WorkoutSession;
};
export type SkipExerciseResponse = {
  message: string;
  workoutSession: WorkoutSession;
};

export type NewPersonalRecord = {
  _id: string;
  user: string;
  exercise: string;
  recordType: string;
  recordCategory: string | null;
  value: number;
  distanceMiles?: number;
  sourceType: string;
  workoutSession: string;
  verification: string | null;
  achievedAt: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
};
export type UnlockedAchievement = {
  id: string;
  name: string;
  description: string;
  category: string;
  badgeKey: string;
  xpAwarded: number;
  unlockedAt: string;
};
export type EchelonReward = {
  echelon: number;
  xp: number;
};

export type CompleteWorkoutResponse = {
  workoutSession: WorkoutSession;

  newPersonalRecords: NewPersonalRecord[];

  unlockedAchievements: UnlockedAchievement[];

  echelonRewards: EchelonReward[];

  xpEarned: {
    workout: number;
    personalRecords: number;
    echelons: number;
    workoutOfTheWeek: number;
    achievements: number;
    total: number;
  };

  dailyXP: {
    earned: number;
    cap: number;
    remaining: number;
    isCapped: boolean;
    wasCapped: boolean;
  };
};

export async function completeActiveWorkout(): Promise<CompleteWorkoutResponse> {
  const response = await apiRequest("/workout-sessions/active/complete", {
    method: "PATCH",
  });

  return await response.json();
}

export async function getWorkoutHistory(
  page = 1,
  limit = 20,
): Promise<WorkoutHistoryResponse> {
  const response = await apiRequest(
    `/workout-sessions/history?page=${page}&limit=${limit}`,
  );

  return await response.json();
}

export async function getWorkoutSession(
  sessionId: string,
): Promise<WorkoutSessionResponse> {
  const response = await apiRequest(`/workout-sessions/${sessionId}`);

  return await response.json();
}

export async function getActiveWorkoutSession(): Promise<WorkoutSessionResponse> {
  const response = await apiRequest("/workout-sessions/active");

  return await response.json();
}

export async function updateActiveExercise(
  order: number,

  actual: UpdateExerciseInput,
): Promise<UpdateExerciseResponse> {
  const response = await apiRequest(
    `/workout-sessions/active/exercises/${order}`,

    {
      method: "PATCH",

      body: JSON.stringify(actual),
    },
  );

  return await response.json();
}

export async function skipActiveExercise(
  order: number,
  skipped: boolean,
): Promise<SkipExerciseResponse> {
  const response = await apiRequest(
    `/workout-sessions/active/exercises/${order}/skip`,
    {
      method: "PATCH",
      body: JSON.stringify({
        skipped,
      }),
    },
  );

  return await response.json();
}

export type StartWorkoutSessionInput = {
  workoutId: string;
};

export async function startWorkoutSession(
  input: StartWorkoutSessionInput,
): Promise<WorkoutSessionResponse> {
  const response = await apiRequest("/workout-sessions/start", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return await response.json();
}

export async function startWorkoutOfTheWeekSession(): Promise<WorkoutSessionResponse> {
  const response = await apiRequest("/workout-sessions/wotw", {
    method: "POST",
  });

  return await response.json();
}

export type CancelWorkoutResponse = {
  message: string;
  workoutSession: WorkoutSession;
};

export async function cancelActiveWorkout(): Promise<CancelWorkoutResponse> {
  const response = await apiRequest("/workout-sessions/active/cancel", {
    method: "PATCH",
  });

  return await response.json();
}

export async function repeatWorkoutSession(
  sessionId: string,
): Promise<WorkoutSessionResponse> {
  const response = await apiRequest(`/workout-sessions/${sessionId}/repeat`, {
    method: "POST",
  });

  return await response.json();
}
