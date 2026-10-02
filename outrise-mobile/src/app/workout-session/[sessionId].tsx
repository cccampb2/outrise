import { AppText as Text } from "@/components/app-text";
import { useLocalSearchParams, router } from "expo-router";
import { View, StyleSheet, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Colors, Fonts } from "@/constants/theme";
import {
  getWorkoutSession,
  type WorkoutSessionExercise,
} from "@/api/workout-sessions";
import { Screen } from "@/components/screen";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSource(sourceType: string) {
  switch (sourceType) {
    case "workout_of_the_week":
      return "Workout of the Week";

    case "repeat":
      return "Repeated Workout";

    default:
      return "Workout";
  }
}

function formatTarget(exercise: WorkoutSessionExercise) {
  const { target } = exercise;

  switch (exercise.measurementType) {
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

function ActualPerformance({ exercise }: { exercise: WorkoutSessionExercise }) {
  const { actual } = exercise;

  switch (exercise.measurementType) {
    case "weight_reps": {
      if (!actual.sets?.length) {
        return <Text style={styles.result}>No result</Text>;
      }

      const totalReps = actual.sets.reduce(
        (total, set) => total + (set.reps ?? 0),
        0,
      );

      const totalVolume = actual.sets.reduce(
        (total, set) => total + (set.reps ?? 0) * (set.weightLbs ?? 0),
        0,
      );

      return (
        <>
          <View style={styles.setList}>
            {actual.sets.map((set) => (
              <View key={set.order} style={styles.setRow}>
                <Text style={styles.setNumber}>
                  SET_{String(set.order + 1).padStart(2, "0")}
                </Text>

                <Text style={styles.setResult}>
                  {set.weightLbs ?? 0} LB × {set.reps ?? 0} REPS
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL_REPS</Text>

              <Text style={styles.totalValue}>
                {totalReps} {totalReps === 1 ? "REP" : "REPS"}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL_VOLUME</Text>

              <Text style={styles.totalValue}>
                {totalVolume.toLocaleString()} LB
              </Text>
            </View>
          </View>
        </>
      );
    }

    case "reps": {
      if (!actual.sets?.length) {
        return <Text style={styles.result}>No result</Text>;
      }

      const totalReps = actual.sets.reduce(
        (total, set) => total + (set.reps ?? 0),
        0,
      );

      return (
        <>
          <View style={styles.setList}>
            {actual.sets.map((set) => (
              <View key={set.order} style={styles.setRow}>
                <Text style={styles.setNumber}>
                  SET_{String(set.order + 1).padStart(2, "0")}
                </Text>

                <Text style={styles.setResult}>
                  {set.reps ?? 0} {(set.reps ?? 0) === 1 ? "REP" : "REPS"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>

              <Text style={styles.totalValue}>
                {totalReps} {totalReps === 1 ? "REP" : "REPS"}
              </Text>
            </View>
          </View>
        </>
      );
    }

    case "distance_time": {
      return (
        <View style={styles.actualStats}>
          {actual.distanceMiles !== undefined ? (
            <View style={styles.actualStatRow}>
              <Text style={styles.actualStatLabel}>DISTANCE</Text>

              <Text style={styles.actualStatValue}>
                {actual.distanceMiles} MI
              </Text>
            </View>
          ) : null}

          {actual.timeSeconds !== undefined ? (
            <View style={styles.actualStatRow}>
              <Text style={styles.actualStatLabel}>TIME</Text>

              <Text style={styles.actualStatValue}>
                {formatTime(actual.timeSeconds)}
              </Text>
            </View>
          ) : null}

          {actual.distanceMiles === undefined &&
          actual.timeSeconds === undefined ? (
            <Text style={styles.result}>No result</Text>
          ) : null}
        </View>
      );
    }

    case "time":
    case "duration":
      return actual.timeSeconds !== undefined ? (
        <View style={styles.actualStats}>
          <View style={styles.actualStatRow}>
            <Text style={styles.actualStatLabel}>TOTAL_TIME</Text>

            <Text style={styles.actualStatValue}>
              {formatTime(actual.timeSeconds)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.result}>No result</Text>
      );

    case "intervals":
      return actual.roundsCompleted !== undefined ? (
        <View style={styles.actualStats}>
          <View style={styles.actualStatRow}>
            <Text style={styles.actualStatLabel}>ROUNDS_COMPLETED</Text>

            <Text style={styles.actualStatValue}>{actual.roundsCompleted}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.result}>No result</Text>
      );

    default:
      return <Text style={styles.result}>No result</Text>;
  }
}

export default function WorkoutSessionDetail() {
  const { sessionId } = useLocalSearchParams<{
    sessionId: string;
  }>();

  const workoutSessionQuery = useQuery({
    queryKey: ["workout-session", sessionId],
    queryFn: () => getWorkoutSession(sessionId),
    enabled: !!sessionId,
  });

  if (workoutSessionQuery.isPending) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.stateEyebrow}>SESSION_DATA</Text>
          <Text style={styles.stateText}>Loading workout...</Text>
        </View>
      </Screen>
    );
  }

  if (workoutSessionQuery.isError) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.errorEyebrow}>SYSTEM_ERROR</Text>
          <Text style={styles.stateText}>Unable to load workout.</Text>
        </View>
      </Screen>
    );
  }

  const workout = workoutSessionQuery.data.workoutSession;

  return (
    <Screen scroll>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>WORKOUT_HISTORY // SESSION</Text>

        <Text style={styles.title}>{workout.workoutName}</Text>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              {workout.status.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.dateText}>
            {new Date(
              workout.completedAt ?? workout.startedAt,
            ).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>01</Text>
        <Text style={styles.sectionTitle}>SESSION_OVERVIEW</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={styles.label}>DURATION</Text>

          <Text style={styles.value}>
            {workout.durationSeconds !== null
              ? formatTime(workout.durationSeconds)
              : "—"}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.label}>EXERCISES</Text>

          <Text style={styles.value}>{workout.exercises.length}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.label}>SOURCE</Text>

          <Text style={styles.value}>{formatSource(workout.sourceType)}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>02</Text>
        <Text style={styles.sectionTitle}>EXERCISE_DATA</Text>
      </View>

      {workout.exercises.map((exercise, index) => (
        <View
          key={`${exercise.exercise}-${exercise.order}`}
          style={styles.exerciseCard}
        >
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseIndex}>
              <Text style={styles.exerciseIndexText}>
                {String(index + 1).padStart(2, "0")}
              </Text>
            </View>

            <View style={styles.exerciseHeaderText}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>

              <Text style={styles.measurementType}>
                {exercise.measurementType.replaceAll("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>

          {exercise.skipped ? (
            <View style={styles.skippedContainer}>
              <Text style={styles.skipped}>[ SKIPPED ]</Text>
            </View>
          ) : (
            <View style={styles.performanceGrid}>
              <View style={styles.performanceSection}>
                <Text style={styles.performanceLabel}>TARGET_</Text>

                <Text style={styles.result}>{formatTarget(exercise)}</Text>
              </View>

              <View style={styles.performanceDivider} />

              <View style={styles.performanceSection}>
                <Text style={styles.performanceLabel}>ACTUAL_</Text>

                <ActualPerformance exercise={exercise} />
              </View>
            </View>
          )}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

  stateText: {
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
    marginBottom: 36,
  },

  eyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  statusDot: {
    width: 5,
    height: 5,
    backgroundColor: Colors.dark.accent,
  },

  statusText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  dateText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
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

  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 32,
  },

  statRow: {
    minHeight: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginVertical: 8,
  },

  label: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  value: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "700",
  },

  exerciseCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 12,
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
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  exerciseIndexText: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "800",
  },

  exerciseHeaderText: {
    flex: 1,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "800",
  },

  measurementType: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
  },

  performanceGrid: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  performanceSection: {
    paddingVertical: 4,
  },

  performanceDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginVertical: 14,
  },

  performanceLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  result: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "700",
  },

  setList: {
    gap: 0,
  },

  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },

  setNumber: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
  },

  setResult: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "700",
  },

  totalSection: {
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderStrong,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  totalValue: {
    color: Colors.dark.accent,
    fontSize: 13,
    fontWeight: "800",
  },

  actualStats: {
    gap: 9,
  },

  actualStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 24,
  },

  actualStatLabel: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  actualStatValue: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "700",
  },

  skippedContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  skipped: {
    color: Colors.dark.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
