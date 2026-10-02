import { Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import {
  getActiveWorkoutSession,
  updateActiveExercise,
  skipActiveExercise,
  completeActiveWorkout,
  cancelActiveWorkout,
  type CompleteWorkoutResponse,
  type UpdateExerciseInput,
  type WorkoutSessionExercise,
} from "@/api/workout-sessions";

import { RepsExercise } from "@/components/workouts/reps-exercise";
import { WeightRepsExercise } from "@/components/workouts/weight-reps-exercise";
import { TimeExercise } from "@/components/workouts/time-exercise";
import { DistanceTimeExercise } from "@/components/workouts/distance-time-exercise";
import { DurationExercise } from "@/components/workouts/duration-exercise";
import { IntervalExercise } from "@/components/workouts/intervals-exercise";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { getCurrentUser } from "@/api/users";
import { setCurrentUser } from "@/store/auth-slice";

function formatPersonalRecordValue(record: {
  recordType: string;
  value: number;
}) {
  if (record.recordType === "max_weight") {
    return `${record.value} LBS`;
  }

  if (record.recordType === "max_reps") {
    return `${record.value} REPS`;
  }

  if (
    record.recordType === "fastest_time" ||
    record.recordType === "longest_duration"
  ) {
    const minutes = Math.floor(record.value / 60);
    const seconds = record.value % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return String(record.value);
}

function getElapsedSeconds(startedAt: string) {
  const startedAtMilliseconds = new Date(startedAt).getTime();
  const currentMilliseconds = Date.now();

  return Math.max(
    0,
    Math.floor((currentMilliseconds - startedAtMilliseconds) / 1000),
  );
}

function formatSessionTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

export default function ActiveWorkout() {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completionResult, setCompletionResult] =
    useState<CompleteWorkoutResponse | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  function hasLoggedPerformance(exercise: WorkoutSessionExercise) {
    if (exercise.skipped) {
      return true;
    }

    if (
      exercise.measurementType === "weight_reps" ||
      exercise.measurementType === "reps"
    ) {
      return (exercise.actual.sets?.length ?? 0) > 0;
    }

    if (
      exercise.measurementType === "time" ||
      exercise.measurementType === "duration"
    ) {
      return (
        exercise.actual.timeSeconds !== undefined &&
        exercise.actual.timeSeconds > 0
      );
    }

    if (exercise.measurementType === "distance_time") {
      return (
        exercise.actual.distanceMiles !== undefined &&
        exercise.actual.distanceMiles > 0 &&
        exercise.actual.timeSeconds !== undefined &&
        exercise.actual.timeSeconds > 0
      );
    }

    if (exercise.measurementType === "intervals") {
      return (
        exercise.actual.roundsCompleted !== undefined &&
        exercise.actual.roundsCompleted > 0
      );
    }

    return false;
  }

  const updateExerciseMutation = useMutation({
    mutationFn: ({
      order,
      actual,
    }: {
      order: number;
      actual: UpdateExerciseInput;
    }) => updateActiveExercise(order, actual),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workout-session", "active"],
      });
    },
  });

  const cancelWorkoutMutation = useMutation({
    mutationFn: cancelActiveWorkout,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["workout-session", "active"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["workout-history"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["workout-of-the-week", "current"],
        }),
      ]);

      router.replace("/(tabs)/train");
    },
  });

  const skipExerciseMutation = useMutation({
    mutationFn: ({ order, skipped }: { order: number; skipped: boolean }) =>
      skipActiveExercise(order, skipped),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workout-session", "active"],
      });
    },
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: completeActiveWorkout,

    onSuccess: async (data) => {
      setCompletionResult(data);

      queryClient.invalidateQueries({
        queryKey: ["workout-session", "active"],
      });

      queryClient.invalidateQueries({
        queryKey: ["workout-history"],
      });

      try {
        const updatedUser = await getCurrentUser();
        dispatch(setCurrentUser(updatedUser));
      } catch (error) {
        console.error(
          "Workout completed, but current user could not be refreshed:",
          error,
        );
      }
    },
  });

  const activeWorkoutQuery = useQuery({
    queryKey: ["workout-session", "active"],
    queryFn: getActiveWorkoutSession,
  });

  const activeWorkout = activeWorkoutQuery.data?.workoutSession;

  useEffect(() => {
    if (!activeWorkout?.startedAt || activeWorkout.status !== "active") {
      return;
    }

    const updateTimer = () => {
      setElapsedSeconds(getElapsedSeconds(activeWorkout.startedAt));
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeWorkout?.startedAt, activeWorkout?.status]);

  if (activeWorkoutQuery.isPending) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.stateEyebrow}>ACTIVE_SESSION</Text>
          <Text style={styles.message}>Loading workout...</Text>
        </View>
      </Screen>
    );
  }

  if (activeWorkoutQuery.isError) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.errorEyebrow}>SYSTEM_ERROR</Text>
          <Text style={styles.message}>Unable to load active workout.</Text>
        </View>
      </Screen>
    );
  }

  if (completionResult) {
    const completedWorkout = completionResult.workoutSession;

    return (
      <Screen scroll bottomInSet={16}>
        <View style={styles.completionContainer}>
          <View style={styles.completionStatus}>
            <View style={styles.completionStatusLine} />
            <Text style={styles.completionEyebrow}>
              SESSION_COMPLETE // VERIFIED
            </Text>
            <View style={styles.completionStatusLine} />
          </View>

          <Text style={styles.completionTitle}>
            {completedWorkout.workoutName}
          </Text>

          <Text style={styles.completionSubtitle}>
            Workout successfully recorded
          </Text>
          {completedWorkout.durationSeconds != null && (
            <View style={styles.completedTimeContainer}>
              <Text style={styles.completedTimeLabel}>SESSION_TIME</Text>

              <Text style={styles.completedTimeValue}>
                {formatSessionTime(completedWorkout.durationSeconds)}
              </Text>

              <Text style={styles.completedTimeStatus}>FINAL</Text>
            </View>
          )}

          <View style={styles.xpCard}>
            <Text style={styles.xpLabel}>TOTAL_XP_EARNED</Text>

            <Text style={styles.xpValue}>
              +{completionResult.xpEarned.total}
            </Text>

            <Text style={styles.xpUnit}>XP</Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>01</Text>
            <Text style={styles.sectionTitle}>XP_BREAKDOWN</Text>
          </View>

          <View style={styles.xpBreakdown}>
            <View style={styles.xpBreakdownRow}>
              <Text style={styles.xpBreakdownLabel}>WORKOUT</Text>
              <Text style={styles.xpBreakdownValue}>
                +{completionResult.xpEarned.workout} XP
              </Text>
            </View>

            {completionResult.xpEarned.personalRecords > 0 && (
              <View style={styles.xpBreakdownRow}>
                <Text style={styles.xpBreakdownLabel}>PERSONAL_RECORDS</Text>
                <Text style={styles.xpBreakdownValue}>
                  +{completionResult.xpEarned.personalRecords} XP
                </Text>
              </View>
            )}

            {completionResult.xpEarned.achievements > 0 && (
              <View style={styles.xpBreakdownRow}>
                <Text style={styles.xpBreakdownLabel}>ACHIEVEMENTS</Text>
                <Text style={styles.xpBreakdownValue}>
                  +{completionResult.xpEarned.achievements} XP
                </Text>
              </View>
            )}

            {completionResult.xpEarned.echelons > 0 && (
              <View style={styles.xpBreakdownRow}>
                <Text style={styles.xpBreakdownLabel}>ECHELON</Text>
                <Text style={styles.xpBreakdownValue}>
                  +{completionResult.xpEarned.echelons} XP
                </Text>
              </View>
            )}

            {completionResult.xpEarned.workoutOfTheWeek > 0 && (
              <View style={styles.xpBreakdownRow}>
                <Text style={styles.xpBreakdownLabel}>WORKOUT_OF_THE_WEEK</Text>
                <Text style={styles.xpBreakdownValue}>
                  +{completionResult.xpEarned.workoutOfTheWeek} XP
                </Text>
              </View>
            )}
          </View>

          {completionResult.newPersonalRecords.length > 0 && (
            <View style={styles.rewardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>PR</Text>
                <Text style={styles.sectionTitle}>NEW_PERSONAL_RECORDS</Text>
              </View>

              {completionResult.newPersonalRecords.map((record) => (
                <View key={record._id} style={styles.rewardItem}>
                  <View style={styles.rewardAccent} />

                  <View style={styles.rewardItemContent}>
                    <Text style={styles.rewardItemEyebrow}>NEW_PR</Text>

                    <Text style={styles.rewardItemTitle}>
                      {record.recordType.replaceAll("_", " ").toUpperCase()}
                    </Text>

                    {record.recordCategory && (
                      <Text style={styles.rewardItemSubtitle}>
                        {record.recordCategory
                          .replaceAll("_", " ")
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.rewardItemValue}>
                    {formatPersonalRecordValue(record)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {completionResult.unlockedAchievements.length > 0 && (
            <View style={styles.rewardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>02</Text>
                <Text style={styles.sectionTitle}>ACHIEVEMENTS_UNLOCKED</Text>
              </View>

              {completionResult.unlockedAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.rewardItem}>
                  <View style={styles.rewardAccent} />

                  <View style={styles.rewardItemContent}>
                    <Text style={styles.rewardItemEyebrow}>ACHIEVEMENT</Text>

                    <Text style={styles.rewardItemTitle}>
                      {achievement.name}
                    </Text>

                    <Text style={styles.rewardItemSubtitle}>
                      {achievement.description}
                    </Text>
                  </View>

                  <Text style={styles.rewardItemValue}>
                    +{achievement.xpAwarded} XP
                  </Text>
                </View>
              ))}
            </View>
          )}

          {completionResult.echelonRewards.length > 0 && (
            <View style={styles.rewardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>03</Text>
                <Text style={styles.sectionTitle}>ECHELON_ADVANCEMENT</Text>
              </View>

              {completionResult.echelonRewards.map((reward) => (
                <View key={reward.echelon} style={styles.rewardItem}>
                  <View style={styles.echelonRewardAccent} />

                  <View style={styles.rewardItemContent}>
                    <Text style={styles.echelonRewardEyebrow}>
                      ECHELON_REACHED
                    </Text>

                    <Text style={styles.rewardItemTitle}>
                      Echelon {reward.echelon}
                    </Text>
                  </View>

                  <Text style={styles.echelonRewardValue}>+{reward.xp} XP</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.dailyXPCard}>
            <View>
              <Text style={styles.dailyXPLabel}>DAILY_XP</Text>

              <Text style={styles.dailyXPValue}>
                {completionResult.dailyXP.earned}
                <Text style={styles.dailyXPCap}>
                  {" "}
                  / {completionResult.dailyXP.cap}
                </Text>
              </Text>
            </View>

            <View style={styles.remainingContainer}>
              <Text style={styles.remainingValue}>
                {completionResult.dailyXP.remaining}
              </Text>
              <Text style={styles.dailyXPRemaining}>REMAINING</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => router.replace("/(tabs)/train")}
          >
            <Text style={styles.doneButtonText}>DONE // RETURN TO TRAIN</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!activeWorkoutQuery.data.workoutSession) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.stateEyebrow}>ACTIVE_SESSION</Text>
          <Text style={styles.message}>No active workout.</Text>
        </View>
      </Screen>
    );
  }

  const workout = activeWorkoutQuery.data.workoutSession;
  const currentExercise = workout.exercises[currentExerciseIndex];

  const canCompleteWorkout = workout.exercises.every(hasLoggedPerformance);

  if (!currentExercise) {
    return (
      <Screen>
        <Text style={styles.errorText}>Exercise unavailable.</Text>
      </Screen>
    );
  }

  function handleSkipExercise() {
    if (currentExercise.skipped) {
      skipExerciseMutation.mutate({
        order: currentExercise.order,
        skipped: false,
      });

      return;
    }

    const loggedSetCount = currentExercise.actual.sets?.length ?? 0;

    const hasPerformance =
      loggedSetCount > 0 ||
      currentExercise.actual.timeSeconds != null ||
      currentExercise.actual.distanceMiles != null ||
      currentExercise.actual.roundsCompleted != null;

    if (!hasPerformance) {
      skipExerciseMutation.mutate({
        order: currentExercise.order,
        skipped: true,
      });

      return;
    }

    let performanceMessage = "You have recorded performance for this exercise.";

    if (loggedSetCount > 0) {
      performanceMessage = `You have ${loggedSetCount} logged ${
        loggedSetCount === 1 ? "set" : "sets"
      }.`;
    }

    Alert.alert(
      `Skip ${currentExercise.exerciseName}?`,
      `${performanceMessage} Skipping this exercise will permanently remove the recorded performance.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Skip & Clear",
          style: "destructive",
          onPress: () => {
            skipExerciseMutation.mutate({
              order: currentExercise.order,
              skipped: true,
            });
          },
        },
      ],
    );
  }

  function handleCancelWorkout() {
    const isWorkoutOfTheWeek = workout.sourceType === "workout_of_the_week";

    const title = isWorkoutOfTheWeek
      ? "Cancel Workout of the Week?"
      : "Cancel Workout?";

    const message = isWorkoutOfTheWeek
      ? "This session cannot be reopened after cancellation. Any performance you have logged in this session will be lost, and you will forfeit the original Workout of the Week bonus XP."
      : "This session cannot be reopened after cancellation. Any performance you have logged in this session will be lost.";

    Alert.alert(title, message, [
      {
        text: "Keep Workout",
        style: "cancel",
      },
      {
        text: "Cancel Workout",
        style: "destructive",
        onPress: () => {
          cancelWorkoutMutation.mutate();
        },
      },
    ]);
  }

  const mutationError =
    updateExerciseMutation.error instanceof ApiError
      ? updateExerciseMutation.error.getDisplayMessage()
      : updateExerciseMutation.error
        ? "Unable to save exercise."
        : undefined;

  return (
    <Screen scroll keyboardAvoiding>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.eyebrow}>TRAIN // ACTIVE_SESSION</Text>

          <View style={styles.sessionTimer}>
            <Text style={styles.sessionTimerLabel}>SESSION_TIME</Text>
            <Text style={styles.sessionTimerValue}>
              {formatSessionTime(elapsedSeconds)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{workout.workoutName}</Text>

        <View style={styles.workoutMeta}>
          <Text style={styles.subtitle}>
            {workout.exercises.length}{" "}
            {workout.exercises.length === 1 ? "EXERCISE" : "EXERCISES"}
          </Text>

          <Text style={styles.exerciseCounter}>
            {String(currentExerciseIndex + 1).padStart(2, "0")} /{" "}
            {String(workout.exercises.length).padStart(2, "0")}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        {workout.exercises.map((exercise, index) => (
          <View
            key={`${exercise.exercise}-${exercise.order}`}
            style={[
              styles.progressSegment,
              index <= currentExerciseIndex && styles.progressSegmentActive,
              hasLoggedPerformance(exercise) && styles.progressSegmentCompleted,
            ]}
          />
        ))}
      </View>

      <View style={styles.exerciseCard}>
        <View style={styles.exerciseCardTop}>
          <Text style={styles.exerciseNumber}>
            EXERCISE_{String(currentExerciseIndex + 1).padStart(2, "0")}
          </Text>

          {currentExercise.skipped && (
            <View style={styles.skippedBadge}>
              <Text style={styles.skippedBadgeText}>[ SKIPPED ]</Text>
            </View>
          )}
        </View>

        <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>

        <Text style={styles.measurementType}>
          {currentExercise.measurementType.replaceAll("_", " ").toUpperCase()}
        </Text>

        <View style={styles.exerciseDivider} />

        {currentExercise.measurementType === "weight_reps" && (
          <WeightRepsExercise
            exercise={currentExercise}
            isSaving={updateExerciseMutation.isPending}
            errorMessage={mutationError}
            onSave={async (sets) => {
              updateExerciseMutation.reset();

              await updateExerciseMutation.mutateAsync({
                order: currentExercise.order,
                actual: { sets },
              });
            }}
          />
        )}

        {currentExercise.measurementType === "intervals" && (
          <IntervalExercise
            exercise={currentExercise}
            isSaving={updateExerciseMutation.isPending}
            errorMessage={mutationError}
            onSave={async (roundsCompleted) => {
              updateExerciseMutation.reset();

              await updateExerciseMutation.mutateAsync({
                order: currentExercise.order,
                actual: { roundsCompleted },
              });
            }}
          />
        )}

        {currentExercise.measurementType === "reps" && (
          <RepsExercise
            exercise={currentExercise}
            isSaving={updateExerciseMutation.isPending}
            errorMessage={mutationError ?? ""}
            onSave={async (sets) => {
              updateExerciseMutation.reset();

              await updateExerciseMutation.mutateAsync({
                order: currentExercise.order,
                actual: { sets },
              });
            }}
          />
        )}

        {currentExercise.measurementType === "time" && (
          <TimeExercise
            exercise={currentExercise}
            isSaving={updateExerciseMutation.isPending}
            errorMessage={mutationError ?? ""}
            onSave={async (timeSeconds) => {
              updateExerciseMutation.reset();

              await updateExerciseMutation.mutateAsync({
                order: currentExercise.order,
                actual: { timeSeconds },
              });
            }}
          />
        )}

        {currentExercise.measurementType === "duration" && (
          <DurationExercise
            exercise={currentExercise}
            isSaving={updateExerciseMutation.isPending}
            errorMessage={mutationError ?? ""}
            onSave={async (timeSeconds) => {
              updateExerciseMutation.reset();

              await updateExerciseMutation.mutateAsync({
                order: currentExercise.order,
                actual: { timeSeconds },
              });
            }}
          />
        )}

        {currentExercise.measurementType === "distance_time" && (
          <DistanceTimeExercise
            exercise={currentExercise}
            isSaving={updateExerciseMutation.isPending}
            errorMessage={mutationError ?? ""}
            onSave={async (distanceMiles, timeSeconds) => {
              updateExerciseMutation.reset();

              await updateExerciseMutation.mutateAsync({
                order: currentExercise.order,
                actual: {
                  distanceMiles,
                  timeSeconds,
                },
              });
            }}
          />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.secondaryButtonPressed,
          ]}
          disabled={skipExerciseMutation.isPending}
          onPress={handleSkipExercise}
        >
          <Text style={styles.skipButtonText}>
            {currentExercise.skipped ? "RESTORE_EXERCISE" : "SKIP_EXERCISE"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.navigationRow}>
        <Pressable
          style={[
            styles.navigationButton,
            currentExerciseIndex === 0 && styles.navigationButtonDisabled,
          ]}
          disabled={currentExerciseIndex === 0}
          onPress={() => setCurrentExerciseIndex((current) => current - 1)}
        >
          <Text style={styles.navigationDirection}>←</Text>
          <Text style={styles.navigationButtonText}>PREVIOUS</Text>
        </Pressable>

        <Pressable
          style={[
            styles.navigationButton,
            currentExerciseIndex === workout.exercises.length - 1 &&
              styles.navigationButtonDisabled,
          ]}
          disabled={currentExerciseIndex === workout.exercises.length - 1}
          onPress={() => setCurrentExerciseIndex((current) => current + 1)}
        >
          <Text style={styles.navigationButtonText}>NEXT</Text>
          <Text style={styles.navigationDirection}>→</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.completeButton,
          (!canCompleteWorkout || completeWorkoutMutation.isPending) &&
            styles.completeButtonDisabled,
          pressed &&
            canCompleteWorkout &&
            !completeWorkoutMutation.isPending &&
            styles.primaryButtonPressed,
        ]}
        disabled={!canCompleteWorkout || completeWorkoutMutation.isPending}
        onPress={() => completeWorkoutMutation.mutate()}
      >
        <Text style={styles.completeButtonText}>
          {completeWorkoutMutation.isPending
            ? "COMPLETING..."
            : "COMPLETE_WORKOUT // ✓"}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.cancelWorkoutButton,
          pressed && styles.cancelWorkoutButtonPressed,
        ]}
        disabled={cancelWorkoutMutation.isPending}
        onPress={handleCancelWorkout}
      >
        <Text style={styles.cancelWorkoutButtonText}>
          {cancelWorkoutMutation.isPending ? "CANCELLING..." : "CANCEL WORKOUT"}
        </Text>
      </Pressable>

      {cancelWorkoutMutation.isError && (
        <Text style={styles.cancelWorkoutError}>
          // UNABLE_TO_CANCEL_WORKOUT
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelWorkoutButton: {
    minHeight: 48,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 12,

    backgroundColor: Colors.dark.dangerSurface,

    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
  },

  cancelWorkoutButtonPressed: {
    backgroundColor: Colors.dark.dangerSurfacePressed,
  },

  cancelWorkoutButtonText: {
    color: Colors.dark.danger,

    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  cancelWorkoutError: {
    color: Colors.dark.danger,

    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,

    marginTop: 8,
    textAlign: "center",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stateEyebrow: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  errorEyebrow: {
    color: Colors.dark.danger,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  message: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 24,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  header: {
    marginBottom: 18,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  sessionTimer: {
    alignItems: "flex-end",
  },

  sessionTimerLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  sessionTimerValue: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontVariant: ["tabular-nums"],
  },

  title: {
    color: Colors.dark.text,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 35,
  },

  workoutMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  exerciseCounter: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  progressTrack: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 24,
  },

  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.dark.border,
  },

  progressSegmentActive: {
    backgroundColor: Colors.dark.borderStrong,
  },

  progressSegmentCompleted: {
    backgroundColor: Colors.dark.accent,
  },

  exerciseCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 4,
    padding: 18,
  },

  exerciseCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  exerciseNumber: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 21,
    fontWeight: "800",
  },

  measurementType: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 5,
  },

  exerciseDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginVertical: 18,
  },

  skippedBadge: {
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundDeep,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  skippedBadgeText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  skipButton: {
    marginTop: 20,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },

  skipButtonText: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  navigationRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  navigationButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  navigationButtonDisabled: {
    opacity: 0.25,
  },

  navigationButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  navigationDirection: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontWeight: "700",
  },

  completeButton: {
    marginTop: 12,
    minHeight: 54,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  completeButtonDisabled: {
    opacity: 0.25,
  },

  completeButtonText: {
    color: Colors.dark.backgroundDeep,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  primaryButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  secondaryButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  errorText: {
    color: Colors.dark.danger,
    fontSize: 12,
    marginTop: 8,
  },

  completionContainer: {
    flex: 1,
    paddingTop: 28,
  },

  completionStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },

  completionStatusLine: {
    width: 24,
    height: 1,
    backgroundColor: Colors.dark.success,
  },

  completionEyebrow: {
    color: Colors.dark.success,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  completionTitle: {
    color: Colors.dark.text,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },

  completionSubtitle: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 28,
  },

  xpCard: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    marginBottom: 26,
  },

  xpLabel: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  xpValue: {
    color: Colors.dark.accent,
    fontSize: 46,
    fontWeight: "800",
    lineHeight: 52,
  },

  xpUnit: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  sectionNumber: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "800",
  },

  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  xpBreakdown: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 26,
    gap: 14,
  },

  xpBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  xpBreakdownLabel: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
  },

  xpBreakdownValue: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "800",
  },

  rewardSection: {
    marginBottom: 26,
  },

  rewardItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
    overflow: "hidden",
  },

  rewardAccent: {
    alignSelf: "stretch",
    width: 3,
    backgroundColor: Colors.dark.accent,
  },

  echelonRewardAccent: {
    alignSelf: "stretch",
    width: 3,
    backgroundColor: Colors.dark.echelon,
  },

  rewardItemContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },

  rewardItemEyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  echelonRewardEyebrow: {
    color: Colors.dark.echelon,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  rewardItemTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "800",
  },

  rewardItemSubtitle: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 15,
  },

  rewardItemValue: {
    color: Colors.dark.accent,
    fontSize: 13,
    fontWeight: "800",
    marginRight: 16,
  },

  echelonRewardValue: {
    color: Colors.dark.echelon,
    fontSize: 13,
    fontWeight: "800",
    marginRight: 16,
  },

  dailyXPCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
  },

  dailyXPLabel: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  dailyXPValue: {
    color: Colors.dark.text,
    fontSize: 21,
    fontWeight: "800",
  },

  dailyXPCap: {
    color: Colors.dark.textDim,
    fontSize: 13,
  },

  remainingContainer: {
    alignItems: "flex-end",
  },

  remainingValue: {
    color: Colors.dark.accent,
    fontSize: 17,
    fontWeight: "800",
  },

  dailyXPRemaining: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  doneButton: {
    marginTop: 18,
    minHeight: 54,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  doneButtonText: {
    color: Colors.dark.backgroundDeep,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  completedTimeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  completedTimeLabel: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  completedTimeValue: {
    color: Colors.dark.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontVariant: ["tabular-nums"],
  },

  completedTimeStatus: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 3,
  },
});
