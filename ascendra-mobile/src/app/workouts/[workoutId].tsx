import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { getWorkoutById, type WorkoutExerciseDetail } from "@/api/workouts";
import { startWorkoutSession } from "@/api/workout-sessions";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTarget(workoutExercise: WorkoutExerciseDetail) {
  const { target } = workoutExercise;

  switch (workoutExercise.exercise.measurementType) {
    case "weight_reps": {
      const parts = [];

      if (target.sets !== undefined) {
        parts.push(`${target.sets} ${target.sets === 1 ? "set" : "sets"}`);
      }

      if (target.reps !== undefined) {
        parts.push(`${target.reps} ${target.reps === 1 ? "rep" : "reps"}`);
      }

      if (target.weightLbs !== undefined) {
        parts.push(`${target.weightLbs} lb`);
      }

      return parts.join(" // ") || "No target";
    }

    case "reps": {
      const parts = [];

      if (target.sets !== undefined) {
        parts.push(`${target.sets} ${target.sets === 1 ? "set" : "sets"}`);
      }

      if (target.reps !== undefined) {
        parts.push(`${target.reps} ${target.reps === 1 ? "rep" : "reps"}`);
      }

      return parts.join(" // ") || "No target";
    }

    case "distance_time": {
      const parts = [];

      if (target.distanceMiles !== undefined) {
        parts.push(`${target.distanceMiles} mi`);
      }

      if (target.timeSeconds !== undefined) {
        parts.push(formatTime(target.timeSeconds));
      }

      return parts.join(" // ") || "No target";
    }

    case "time":
    case "duration":
      return target.timeSeconds !== undefined
        ? formatTime(target.timeSeconds)
        : "No target";

    case "intervals": {
      const parts = [];

      if (target.workSeconds !== undefined) {
        parts.push(`${target.workSeconds}s work`);
      }

      if (target.recoverySeconds !== undefined) {
        parts.push(`${target.recoverySeconds}s recovery`);
      }

      if (target.rounds !== undefined) {
        parts.push(`${target.rounds} rounds`);
      }

      return parts.join(" // ") || "No target";
    }

    default:
      return "No target";
  }
}

export default function WorkoutDetailScreen() {
  const { workoutId } = useLocalSearchParams<{
    workoutId: string;
  }>();

  const queryClient = useQueryClient();

  const workoutQuery = useQuery({
    queryKey: ["workout", workoutId],
    queryFn: () => getWorkoutById(workoutId),
    enabled: !!workoutId,
  });

  const startWorkoutMutation = useMutation({
    mutationFn: () =>
      startWorkoutSession({
        workoutId,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workout-session", "active"],
      });

      router.replace("/workout-session/active");
    },
  });

  if (workoutQuery.isPending) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <ActivityIndicator color={Colors.dark.accent} />

          <Text style={styles.stateText}>{"// LOADING_WORKOUT..."}</Text>
        </View>
      </Screen>
    );
  }

  if (workoutQuery.isError) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.errorCode}>SYSTEM_ERROR</Text>
          <Text style={styles.stateText}>Unable to load workout.</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => workoutQuery.refetch()}
          >
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const workout = workoutQuery.data.workout;

  return (
    <Screen scroll>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>ASCENDRA // TRAINING</Text>

        <Text style={styles.title}>{workout.name}</Text>

        {workout.description ? (
          <Text style={styles.description}>{workout.description}</Text>
        ) : null}

        <View style={styles.metadataRow}>
          <Text style={styles.metadata}>
            {workout.visibility.toUpperCase()}
          </Text>

          <View style={styles.metadataDivider} />

          <Text style={styles.metadata}>
            {String(workout.exercises.length).padStart(2, "0")}{" "}
            {workout.exercises.length === 1 ? "EXERCISE" : "EXERCISES"}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>WORKOUT_PRESCRIPTION</Text>
      </View>

      <View style={styles.exerciseList}>
        {workout.exercises.map((workoutExercise, index) => {
          const exercise = workoutExercise.exercise;

          return (
            <View
              key={`${exercise._id}-${workoutExercise.order}`}
              style={styles.exerciseCard}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseIndex}>
                  <Text style={styles.exerciseIndexText}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.exerciseHeading}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>

                  <Text style={styles.exerciseCategory}>
                    {exercise.category.toUpperCase()} //{" "}
                    {exercise.measurementType
                      .replaceAll("_", " ")
                      .toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.targetSection}>
                <Text style={styles.targetLabel}>TARGET_</Text>

                <Text style={styles.targetValue}>
                  {formatTarget(workoutExercise)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {startWorkoutMutation.isError ? (
        <View style={styles.startError}>
          <Text style={styles.startErrorCode}>UNABLE_TO_START_WORKOUT</Text>

          <Text style={styles.startErrorText}>
            {startWorkoutMutation.error instanceof Error
              ? startWorkoutMutation.error.message
              : "Unable to start workout."}
          </Text>
        </View>
      ) : null}

      <Pressable
        disabled={startWorkoutMutation.isPending}
        onPress={() => startWorkoutMutation.mutate()}
        style={({ pressed }) => [
          styles.startButton,
          pressed &&
            !startWorkoutMutation.isPending &&
            styles.startButtonPressed,
          startWorkoutMutation.isPending && styles.startButtonDisabled,
        ]}
      >
        <View>
          <Text style={styles.startEyebrow}>BEGIN_SESSION</Text>

          <Text style={styles.startText}>
            {startWorkoutMutation.isPending ? "STARTING..." : "START WORKOUT"}
          </Text>
        </View>

        <Text style={styles.startArrow}>→</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stateText: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
  },

  errorCode: {
    color: Colors.dark.danger,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  retryText: {
    color: Colors.dark.textSecondary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
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
    marginBottom: 34,
  },

  eyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  title: {
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 330,
  },

  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 10,
  },

  metadata: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  metadataDivider: {
    width: 3,
    height: 3,
    backgroundColor: Colors.dark.accent,
    transform: [{ rotate: "45deg" }],
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  exerciseList: {
    gap: 10,
  },

  exerciseCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  exerciseIndex: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  exerciseIndexText: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "800",
  },

  exerciseHeading: {
    flex: 1,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "800",
  },

  exerciseCategory: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
  },

  targetSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  targetLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  targetValue: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  startError: {
    marginTop: 18,
    padding: 14,
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
  },

  startErrorCode: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  startErrorText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  startButton: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 22,
    marginBottom: 20,

    paddingHorizontal: 16,
    paddingVertical: 12,

    backgroundColor: Colors.dark.backgroundElement,

    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  startButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  startButtonDisabled: {
    opacity: 0.5,
  },

  startEyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  startText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  startArrow: {
    color: Colors.dark.accent,
    fontSize: 18,
    fontWeight: "800",
  },
});
