import { AppText as Text } from "@/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import {
  repeatWorkoutSession,
  startWorkoutOfTheWeekSession,
} from "@/api/workout-sessions";
import {
  getCurrentWorkoutOfTheWeek,
  type WorkoutOfTheWeekDifficulty,
  type WorkoutOfTheWeekExercise,
} from "@/api/workout-of-the-week";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDifficulty(difficulty: WorkoutOfTheWeekDifficulty) {
  switch (difficulty) {
    case "easy":
      return "EASY";

    case "medium":
      return "MEDIUM";

    case "hard":
      return "HARD";

    case "impossible":
      return "IMPOSSIBLE";

    case "just_fun":
      return "JUST FUN";
  }
}

function getRemainingSeconds(endsAt: string) {
  const endMilliseconds = new Date(endsAt).getTime();
  const currentMilliseconds = Date.now();

  return Math.max(
    0,
    Math.floor((endMilliseconds - currentMilliseconds) / 1000),
  );
}

function formatCountdown(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}D ${String(hours).padStart(2, "0")}H ${String(
      minutes,
    ).padStart(2, "0")}M`;
  }

  return `${String(hours).padStart(2, "0")}H ${String(minutes).padStart(
    2,
    "0",
  )}M ${String(seconds).padStart(2, "0")}S`;
}

function formatExerciseTarget(exercise: WorkoutOfTheWeekExercise) {
  const { measurementType, target } = exercise;

  switch (measurementType) {
    case "weight_reps":
      return `${target.sets ?? 0} SETS × ${target.reps ?? 0} REPS${
        target.weightLbs !== undefined ? ` @ ${target.weightLbs} LB` : ""
      }`;

    case "reps":
      return `${target.sets ?? 0} SETS × ${target.reps ?? 0} REPS`;

    case "time":
      return target.timeSeconds !== undefined
        ? formatTime(target.timeSeconds)
        : "--";

    case "distance_time": {
      const distance =
        target.distanceMiles !== undefined
          ? `${target.distanceMiles} MI`
          : "--";

      const time =
        target.timeSeconds !== undefined
          ? formatTime(target.timeSeconds)
          : "--";

      return `${distance} // ${time}`;
    }

    case "duration":
      return target.timeSeconds !== undefined
        ? formatTime(target.timeSeconds)
        : "--";

    case "intervals":
      return `${target.rounds ?? 0} ROUNDS // ${
        target.workSeconds ?? 0
      }S WORK // ${target.recoverySeconds ?? 0}S RECOVERY`;

    default:
      return "--";
  }
}

export default function WorkoutOfTheWeekScreen() {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [startCountdown, setStartCountdown] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const currentWorkoutOfTheWeekQuery = useQuery({
    queryKey: ["workout-of-the-week", "current"],
    queryFn: getCurrentWorkoutOfTheWeek,
  });

  const currentWorkoutOfTheWeek =
    currentWorkoutOfTheWeekQuery.data?.currentWorkoutOfTheWeek;

  const occurrence = currentWorkoutOfTheWeek?.occurrence;

  const workoutSession = currentWorkoutOfTheWeek?.workoutSession;

  const startWorkoutOfTheWeekMutation = useMutation({
    mutationFn: startWorkoutOfTheWeekSession,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["workout-session", "active"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["workout-of-the-week", "current"],
        }),
      ]);

      router.replace("/workout-session/active");
    },
  });

  const repeatWorkoutMutation = useMutation({
    mutationFn: repeatWorkoutSession,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["workout-session", "active"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["workout-of-the-week", "current"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["workout-history"],
        }),
      ]);

      router.replace("/workout-session/active");
    },
  });

  useEffect(() => {
    if (!occurrence?.endsAt) {
      return;
    }

    const updateCountdown = () => {
      setRemainingSeconds(getRemainingSeconds(occurrence.endsAt));
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [occurrence?.endsAt]);

  // Create the session only after the safety countdown, so cancelling does not start a workout.

  const { mutate: startChallenge } = startWorkoutOfTheWeekMutation;
  useEffect(() => {
    if (startCountdown === null) return;
    const timeout = setTimeout(
      () => {
        if (startCountdown === 0) {
          setStartCountdown(null);
          startChallenge();
        } else {
          setStartCountdown((current) =>
            current === null ? null : current - 1,
          );
        }
      },
      startCountdown === 0 ? 0 : 1000,
    );
    return () => clearTimeout(timeout);
  }, [startCountdown, startChallenge]);

  function handleStartChallenge() {
    setStartCountdown(10);
  }

  function handleCancelStart() {
    setStartCountdown(null);
  }

  return (
    <Screen scroll>
      <View style={styles.page}>
        {/* BACK */}

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </Pressable>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>WEEKLY_CHALLENGE</Text>

          <Text style={styles.title}>Workout of the Week</Text>

          <Text style={styles.subtitle}>
            Complete the active weekly protocol and earn bonus XP.
          </Text>

          <View style={styles.headerLine}>
            <View style={styles.headerLineAccent} />
          </View>
        </View>

        {/* QUERY STATE */}

        {currentWorkoutOfTheWeekQuery.isPending ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>
              {"// LOADING_WEEKLY_CHALLENGE..."}
            </Text>
          </View>
        ) : currentWorkoutOfTheWeekQuery.isError ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>
              {"// UNABLE_TO_LOAD_WEEKLY_CHALLENGE"}
            </Text>
          </View>
        ) : !occurrence ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>
              {"// NO_ACTIVE_WEEKLY_CHALLENGE"}
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* STATUS */}

            <View style={styles.challengeHeader}>
              <View style={styles.challengeStatusGroup}>
                <View style={styles.statusDot} />

                <Text style={styles.challengeStatus}>ACTIVE_CHALLENGE</Text>
              </View>

              <Text style={styles.difficulty}>
                [{formatDifficulty(occurrence.difficulty)}]
              </Text>
            </View>

            {/* WORKOUT INFORMATION */}

            <Text style={styles.workoutName}>{occurrence.name}</Text>

            <Text style={styles.description}>{occurrence.description}</Text>

            {/* COUNTDOWN */}

            <View style={styles.countdown}>
              <View>
                <Text style={styles.countdownLabel}>CHALLENGE_ENDS_IN</Text>

                <Text style={styles.countdownValue}>
                  {remainingSeconds > 0
                    ? formatCountdown(remainingSeconds)
                    : "00H 00M 00S"}
                </Text>
              </View>

              <Text style={styles.countdownStatus}>
                {remainingSeconds > 0 ? "ACTIVE" : "EXPIRED"}
              </Text>
            </View>

            {/* METADATA */}

            <View style={styles.metadata}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>DIFFICULTY</Text>

                <Text style={styles.metadataValue}>
                  {formatDifficulty(occurrence.difficulty)}
                </Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>BONUS_XP</Text>

                <Text style={styles.metadataValue}>+{occurrence.bonusXP}</Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>EXERCISES</Text>

                <Text style={styles.metadataValue}>
                  {occurrence.exercises.length}
                </Text>
              </View>
            </View>

            {/* WORKOUT PRESCRIPTION */}

            <View style={styles.prescription}>
              <View style={styles.prescriptionHeader}>
                <View>
                  <Text style={styles.prescriptionEyebrow}>
                    WORKOUT_PRESCRIPTION
                  </Text>

                  <Text style={styles.prescriptionTitle}>
                    Exercise Protocol
                  </Text>
                </View>

                <Text style={styles.prescriptionCount}>
                  {String(occurrence.exercises.length).padStart(2, "0")}
                </Text>
              </View>

              {occurrence.exercises.map((exercise, index) => (
                <View key={exercise._id} style={styles.exerciseRow}>
                  <View style={styles.exerciseOrder}>
                    <Text style={styles.exerciseOrderText}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                  </View>

                  <View style={styles.exerciseInformation}>
                    <Text style={styles.exerciseName}>
                      {exercise.exerciseName}
                    </Text>

                    <Text style={styles.exerciseTarget}>
                      {formatExerciseTarget(exercise)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* CHALLENGE ACTION */}

            {workoutSession?.status === "active" ? (
              <Pressable
                onPress={() => router.push("/workout-session/active")}
                style={({ pressed }) => [
                  styles.challengeButton,
                  pressed ? styles.challengeButtonPressed : null,
                ]}
              >
                <View>
                  <Text style={styles.challengeButtonEyebrow}>
                    SESSION_IN_PROGRESS
                  </Text>

                  <Text style={styles.challengeButtonText}>
                    RESUME CHALLENGE
                  </Text>
                </View>

                <Text style={styles.challengeButtonArrow}>→</Text>
              </Pressable>
            ) : workoutSession?.status === "completed" ? (
              <>
                <View style={styles.completedChallenge}>
                  <Text style={styles.completedChallengeEyebrow}>
                    WEEKLY_PROTOCOL
                  </Text>

                  <Text style={styles.completedChallengeText}>
                    CHALLENGE COMPLETED
                  </Text>
                </View>

                <Pressable
                  disabled={repeatWorkoutMutation.isPending}
                  onPress={() =>
                    repeatWorkoutMutation.mutate(workoutSession._id)
                  }
                  style={({ pressed }) => [
                    styles.repeatButton,
                    pressed ? styles.repeatButtonPressed : null,
                    repeatWorkoutMutation.isPending
                      ? styles.challengeButtonDisabled
                      : null,
                  ]}
                >
                  <View>
                    <Text style={styles.repeatButtonEyebrow}>
                      RUN_PROTOCOL_AGAIN
                    </Text>

                    <Text style={styles.repeatButtonText}>
                      {repeatWorkoutMutation.isPending
                        ? "INITIALIZING..."
                        : "REPEAT CHALLENGE"}
                    </Text>
                  </View>

                  <Text style={styles.repeatButtonArrow}>→</Text>
                </Pressable>

                <View style={styles.repeatNotice}>
                  <Text style={styles.repeatNoticeLabel}>NOTE //</Text>

                  <Text style={styles.repeatNoticeText}>
                    Repeated Workouts of the Week do not award the original WOTW
                    bonus XP.
                  </Text>
                </View>
              </>
            ) : workoutSession?.status === "cancelled" ? (
              <>
                <View style={styles.cancelledChallenge}>
                  <Text style={styles.cancelledChallengeEyebrow}>
                    ORIGINAL_ATTEMPT_TERMINATED
                  </Text>

                  <Text style={styles.cancelledChallengeText}>
                    CHALLENGE CANCELLED
                  </Text>

                  <Text style={styles.cancelledChallengeDescription}>
                    The original WOTW bonus XP has been forfeited. You may still
                    repeat this workout for normal workout rewards.
                  </Text>
                </View>

                <Pressable
                  disabled={repeatWorkoutMutation.isPending}
                  onPress={() =>
                    repeatWorkoutMutation.mutate(workoutSession._id)
                  }
                  style={({ pressed }) => [
                    styles.repeatButton,
                    pressed ? styles.repeatButtonPressed : null,
                    repeatWorkoutMutation.isPending
                      ? styles.challengeButtonDisabled
                      : null,
                  ]}
                >
                  <View>
                    <Text style={styles.repeatButtonEyebrow}>
                      RUN_PROTOCOL_AGAIN
                    </Text>

                    <Text style={styles.repeatButtonText}>
                      {repeatWorkoutMutation.isPending
                        ? "INITIALIZING..."
                        : "REPEAT CHALLENGE"}
                    </Text>
                  </View>

                  <Text style={styles.repeatButtonArrow}>→</Text>
                </Pressable>

                <View style={styles.repeatNotice}>
                  <Text style={styles.repeatNoticeLabel}>NOTE //</Text>

                  <Text style={styles.repeatNoticeText}>
                    Repeated Workouts of the Week do not award the original WOTW
                    bonus XP.
                  </Text>
                </View>
              </>
            ) : startCountdown !== null ? (
              <View style={styles.startCountdownContainer}>
                <View style={styles.startCountdownHeader}>
                  <View>
                    <Text style={styles.startCountdownEyebrow}>
                      START_SEQUENCE
                    </Text>

                    <Text style={styles.startCountdownTitle}>
                      CHALLENGE STARTING
                    </Text>
                  </View>

                  <Text style={styles.startCountdownStatus}>[ARMED]</Text>
                </View>

                <Text style={styles.startCountdownValue}>
                  {String(startCountdown).padStart(2, "0")}
                </Text>

                <Text style={styles.startCountdownDescription}>
                  Your Workout of the Week attempt will begin automatically when
                  the countdown reaches zero.
                </Text>

                <Pressable
                  onPress={handleCancelStart}
                  style={({ pressed }) => [
                    styles.cancelStartButton,
                    pressed ? styles.cancelStartButtonPressed : null,
                  ]}
                >
                  <Text style={styles.cancelStartButtonText}>CANCEL START</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                disabled={startWorkoutOfTheWeekMutation.isPending}
                onPress={handleStartChallenge}
                style={({ pressed }) => [
                  styles.challengeButton,
                  pressed ? styles.challengeButtonPressed : null,
                  startWorkoutOfTheWeekMutation.isPending
                    ? styles.challengeButtonDisabled
                    : null,
                ]}
              >
                <View>
                  <Text style={styles.challengeButtonEyebrow}>
                    WEEKLY_PROTOCOL
                  </Text>

                  <Text style={styles.challengeButtonText}>
                    {startWorkoutOfTheWeekMutation.isPending
                      ? "INITIALIZING..."
                      : "START CHALLENGE"}
                  </Text>
                </View>

                <Text style={styles.challengeButtonArrow}>→</Text>
              </Pressable>
            )}

            {/* MUTATION ERRORS */}

            {startWorkoutOfTheWeekMutation.isError && (
              <Text style={styles.challengeError}>
                {"// UNABLE_TO_START_WEEKLY_CHALLENGE"}
              </Text>
            )}

            {repeatWorkoutMutation.isError && (
              <Text style={styles.challengeError}>
                {"// UNABLE_TO_REPEAT_WEEKLY_CHALLENGE"}
              </Text>
            )}
          </View>
        )}

        {/* BRAND */}

        <View style={styles.brandFooter}>
          <View style={styles.brandLine} />

          <Text style={styles.brandWordmark}>OUTRISE</Text>

          <View style={styles.brandLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 18,
  },

  backButtonText: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  header: {
    marginBottom: 24,
  },

  eyebrow: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  headerLine: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 18,
  },

  headerLineAccent: {
    position: "absolute",
    top: -1,
    left: 0,
    width: 44,
    height: 2,
    backgroundColor: Colors.dark.accent,
  },

  systemMessage: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
  },

  systemMessageText: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  content: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
  },

  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  challengeStatusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },

  challengeStatus: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  difficulty: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  workoutName: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 8,
  },

  countdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
  },

  countdownLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  countdownValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.2,
    fontVariant: ["tabular-nums"],
  },

  countdownStatus: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  metadata: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  metadataItem: {
    flex: 1,
  },

  metadataDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 10,
  },

  metadataLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  metadataValue: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "900",
  },

  prescription: {
    marginTop: 28,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  prescriptionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  prescriptionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 3,
  },

  prescriptionTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "800",
  },

  prescriptionCount: {
    color: Colors.dark.borderStrong,
    fontSize: 18,
    fontWeight: "900",
  },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 70,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    marginTop: 8,
  },

  exerciseOrder: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: Colors.dark.borderSubtle,
  },

  exerciseOrderText: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  exerciseInformation: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  exerciseName: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: "900",
  },

  exerciseTarget: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: 5,
  },

  challengeButton: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 24,
  },

  challengeButtonPressed: {
    backgroundColor: Colors.dark.accentPressed,
  },

  challengeButtonDisabled: {
    opacity: 0.55,
  },

  challengeButtonEyebrow: {
    color: Colors.dark.background,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  challengeButtonText: {
    color: Colors.dark.background,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  challengeButtonArrow: {
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: "900",
  },

  challengeError: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 10,
  },

  /* START SAFETY COUNTDOWN */

  startCountdownContainer: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: 16,
    marginTop: 24,
  },

  startCountdownHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  startCountdownEyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  startCountdownTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  startCountdownStatus: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  startCountdownValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.accent,
    fontSize: 52,
    lineHeight: 62,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    marginTop: 14,
  },

  startCountdownDescription: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },

  cancelStartButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
  },

  cancelStartButtonPressed: {
    backgroundColor: Colors.dark.dangerSurfacePressed,
  },

  cancelStartButtonText: {
    color: Colors.dark.danger,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  completedChallenge: {
    minHeight: 64,
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 24,
  },

  completedChallengeEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  completedChallengeText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  repeatButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
  },

  repeatButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  repeatButtonEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 4,
  },

  repeatButtonText: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  repeatButtonArrow: {
    color: Colors.dark.accent,
    fontSize: 18,
    fontWeight: "900",
  },

  repeatNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.dark.backgroundDeep,
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },

  repeatNoticeLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    marginRight: 6,
  },

  repeatNoticeText: {
    flex: 1,
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },

  cancelledChallenge: {
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
  },

  cancelledChallengeEyebrow: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  cancelledChallengeText: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  cancelledChallengeDescription: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 15,
    marginTop: 7,
  },

  brandFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 38,
    marginBottom: 10,
    paddingHorizontal: 20,
  },

  brandLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  brandWordmark: {
    color: Colors.dark.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4.5,
  },
});
