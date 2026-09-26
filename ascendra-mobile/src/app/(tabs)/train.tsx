import { StyleSheet, Text, View, Pressable } from "react-native";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getActiveWorkoutSession } from "@/api/workout-sessions";

export default function TrainScreen() {
  const router = useRouter();

  const activeWorkoutQuery = useQuery({
    queryKey: ["workout-session", "active"],
    queryFn: getActiveWorkoutSession,
  });

  const activeWorkout = activeWorkoutQuery.data?.workoutSession;

  return (
    <Screen scroll>
      <View style={styles.page}>
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />

            <Text style={styles.systemStatusText}>ASCENDRA // TRAINING</Text>
          </View>

          <Text style={styles.sectionEyebrow}>TRAINING_CENTER</Text>

          <Text style={styles.title}>Train</Text>

          <Text style={styles.subtitle}>
            Start, continue, and manage your training.
          </Text>

          <View style={styles.headerLine}>
            <View style={styles.headerLineAccent} />
          </View>
        </View>

        {/* ACTIVE WORKOUT */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>CURRENT_SESSION</Text>

            <Text style={styles.sectionTitle}>Active Workout</Text>
          </View>

          <Text style={styles.sectionNumber}>01</Text>
        </View>

        {activeWorkout ? (
          <Pressable
            onPress={() => router.push("/workout-session/active")}
            style={({ pressed }) => [
              styles.activeWorkoutCard,
              pressed ? styles.activeWorkoutCardPressed : null,
            ]}
          >
            {/* HUD corners */}

            <View style={styles.hudCornerTL} />
            <View style={styles.hudCornerBR} />

            {/* STATUS */}

            <View style={styles.activeWorkoutHeader}>
              <View style={styles.activeWorkoutStatusGroup}>
                <View style={styles.activeStatusDot} />

                <Text style={styles.activeWorkoutLabel}>
                  WORKOUT_IN_PROGRESS
                </Text>
              </View>

              <Text style={styles.activeWorkoutStatus}>[ACTIVE]</Text>
            </View>

            {/* WORKOUT */}

            <View style={styles.workoutInformation}>
              <Text style={styles.activeWorkoutName} numberOfLines={2}>
                {activeWorkout.workoutName}
              </Text>

              <Text style={styles.activeWorkoutDetails}>
                {`${activeWorkout.exercises.length} ${
                  activeWorkout.exercises.length === 1
                    ? "EXERCISE"
                    : "EXERCISES"
                }`}
              </Text>
            </View>

            {/* DIVIDER */}

            <View style={styles.workoutDivider} />

            {/* ACTION */}

            <View style={styles.resumeRow}>
              <View style={styles.resumeIndicator} />

              <Text style={styles.resumeWorkoutText}>RESUME_WORKOUT</Text>

              <Text style={styles.resumeArrow}>→</Text>
            </View>
          </Pressable>
        ) : activeWorkoutQuery.isPending ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>
              {"// CHECKING_ACTIVE_SESSION..."}
            </Text>
          </View>
        ) : activeWorkoutQuery.isError ? (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>
              {"// UNABLE_TO_LOAD_ACTIVE_SESSION"}
            </Text>
          </View>
        ) : (
          <View style={styles.noActiveWorkout}>
            <View style={styles.noActiveTop}>
              <View style={styles.inactiveDot} />

              <Text style={styles.noActiveLabel}>SESSION_STATUS</Text>
            </View>

            <Text style={styles.noActiveTitle}>No active workout</Text>

            <Text style={styles.noActiveDescription}>
              You don't currently have a workout in progress.
            </Text>
          </View>
        )}

        {/* BRAND */}

        <View style={styles.brandFooter}>
          <View style={styles.brandLine} />

          <Text style={styles.brandWordmark}>ASCENDRA</Text>

          <View style={styles.brandLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 24,
  },

  /* HEADER */

  header: {
    paddingTop: 16,
    marginBottom: 28,
  },

  systemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },

  systemStatusText: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  sectionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
  },

  title: {
    color: Colors.dark.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
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

  /* SECTION HEADER */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  sectionNumber: {
    color: Colors.dark.border,
    fontSize: 20,
    fontWeight: "900",
  },

  /* ACTIVE WORKOUT */

  activeWorkoutCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: 18,
    marginBottom: 28,
  },

  activeWorkoutCardPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    opacity: 0.85,
  },

  hudCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.dark.accent,
  },

  hudCornerBR: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.dark.accent,
  },

  activeWorkoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  activeWorkoutStatusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  activeStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },

  activeWorkoutLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  activeWorkoutStatus: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  workoutInformation: {
    marginTop: 24,
  },

  activeWorkoutName: {
    color: Colors.dark.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  activeWorkoutDetails: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 7,
  },

  workoutDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 22,
    marginBottom: 14,
  },

  resumeRow: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
  },

  resumeIndicator: {
    width: 3,
    height: 18,
    backgroundColor: Colors.dark.accent,
    marginRight: 10,
  },

  resumeWorkoutText: {
    flex: 1,
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  resumeArrow: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "900",
  },

  /* EMPTY / LOADING STATES */

  systemMessage: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 28,
  },

  systemMessageText: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  noActiveWorkout: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 28,
  },

  noActiveTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
  },

  inactiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.textDim,
  },

  noActiveLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  noActiveTitle: {
    color: Colors.dark.textSecondary,
    fontSize: 18,
    fontWeight: "800",
  },

  noActiveDescription: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  /* BRAND */

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
