import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";

import { Screen } from "@/components/screen";
import { ActivityRow } from "@/components/activity-row";
import { Colors, TAB_BAR_HEIGHT } from "@/constants/theme";
import { getFactions } from "@/api/factions";
import {
  getCurrentWorkoutOfTheWeek,
  type WorkoutOfTheWeekDifficulty,
} from "@/api/workout-of-the-week";
import type { RootState } from "@/store/store";

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

function formatRemainingTime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);

  if (days > 0) {
    return `${days}D ${hours}H LEFT`;
  }

  if (hours > 0) {
    return `${hours} HRS LEFT`;
  }

  const minutes = Math.floor(totalSeconds / 60);

  if (minutes > 0) {
    return `${minutes} MIN LEFT`;
  }

  return "<1 MIN LEFT";
}

export default function HomeScreen() {
  const user = useSelector((state: RootState) => state.auth.user);

  const factionsQuery = useQuery({
    queryKey: ["factions"],
    queryFn: getFactions,
  });

  const currentWorkoutOfTheWeekQuery = useQuery({
    queryKey: ["workout-of-the-week", "current"],
    queryFn: getCurrentWorkoutOfTheWeek,
  });

  const faction = factionsQuery.data?.factions.find(
    (faction) => faction._id === user?.faction,
  );

  const currentWorkoutOfTheWeek =
    currentWorkoutOfTheWeekQuery.data?.currentWorkoutOfTheWeek;

  const workoutOfTheWeekOccurrence = currentWorkoutOfTheWeek?.occurrence;

  const workoutOfTheWeekSession = currentWorkoutOfTheWeek?.workoutSession;

  const accent = faction?.colors.primary ?? Colors.dark.accent;

  const accentBorder = faction?.colors.border ?? Colors.dark.border;

  const progressPercent = Math.min(
    Math.max(user?.progression.progressPercent ?? 0, 0),
    100,
  );

  const progressTipPercent = Math.min(Math.max(progressPercent, 0), 99);

  const workoutOfTheWeekRemainingSeconds = workoutOfTheWeekOccurrence
    ? getRemainingSeconds(workoutOfTheWeekOccurrence.endsAt)
    : 0;

  return (
    <Screen scroll bottomInSet={TAB_BAR_HEIGHT} hideTabBarOnScroll>
      <View style={styles.page}>
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.systemStatus}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: accent,
                  },
                ]}
              />

              <Text style={styles.systemStatusText}>ASCENDRA // ACTIVE</Text>
            </View>

            <Text
              style={[
                styles.levelCode,
                {
                  color: accent,
                },
              ]}
            >
              {`LEVEL_${String(user?.progression.level ?? 0).padStart(3, "0")}`}
            </Text>
          </View>

          <Text style={styles.greeting}>Good afternoon,</Text>

          <Text style={styles.username}>{user?.username}</Text>

          <View style={styles.headerLine}>
            <View
              style={[
                styles.headerLineAccent,
                {
                  backgroundColor: accent,
                },
              ]}
            />
          </View>
        </View>

        {/* PROGRESSION */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>YOUR_PROGRESS</Text>

            <Text style={styles.sectionTitle}>Overview</Text>
          </View>

          <Text style={styles.sectionNumber}>01</Text>
        </View>

        <View
          style={[
            styles.progressCard,
            {
              borderColor: accentBorder,
            },
          ]}
        >
          <View
            style={[
              styles.hudCornerTL,
              {
                borderColor: accent,
              },
            ]}
          />

          <View
            style={[
              styles.hudCornerBR,
              {
                borderColor: accent,
              },
            ]}
          />

          <View style={styles.progressTop}>
            <View style={styles.progressStat}>
              <Text style={styles.dataLabel}>FACTION</Text>

              <Text
                style={[
                  styles.factionName,
                  {
                    color: accent,
                  },
                ]}
              >
                {faction?.name?.toUpperCase() ?? "---"}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.progressStat}>
              <Text style={styles.dataLabel}>ECHELON</Text>

              <Text style={styles.progressValue}>
                {user?.progression.echelon !== null &&
                user?.progression.echelon !== undefined
                  ? String(user.progression.echelon).padStart(2, "0")
                  : "--"}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.progressStat}>
              <Text style={styles.dataLabel}>LEVEL</Text>

              <Text style={styles.progressValue}>
                {user?.progression.level ?? 0}
              </Text>
            </View>
          </View>

          <View style={styles.progressDivider} />

          <View style={styles.xpSection}>
            <View style={styles.xpTextRow}>
              <Text style={styles.xpLabel}>LEVEL_PROGRESS</Text>

              <Text style={styles.xpRemaining}>
                {`${user?.progression.xpRemaining ?? 0} XP TO GO`}
              </Text>
            </View>

            <View style={styles.xpTrack}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: accent,
                  },
                ]}
              />

              <View
                style={[
                  styles.xpTip,
                  {
                    left: `${progressTipPercent}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>

            <View style={styles.xpFooter}>
              <Text style={styles.xpFooterText}>
                {`${user?.progression.xpIntoCurrentLevel ?? 0} XP`}
              </Text>

              <Text
                style={[
                  styles.xpPercent,
                  {
                    color: accent,
                  },
                ]}
              >
                {`[${Math.round(progressPercent)}%]`}
              </Text>

              <Text style={styles.xpFooterText}>
                {`${user?.progression.xpRequiredForNextLevel ?? 0} XP`}
              </Text>
            </View>
          </View>
        </View>

        {/* WORKOUT OF THE WEEK */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>FEATURED_WORKOUT</Text>

            <Text style={styles.sectionTitle}>Workout of the Week</Text>
          </View>

          <Text style={styles.sectionNumber}>02</Text>
        </View>

        {currentWorkoutOfTheWeekQuery.isPending ? (
          <View style={styles.wotwSystemMessage}>
            <Text style={styles.wotwSystemMessageText}>
              {"// LOADING_WEEKLY_CHALLENGE..."}
            </Text>
          </View>
        ) : currentWorkoutOfTheWeekQuery.isError ? (
          <View style={styles.wotwSystemMessage}>
            <Text style={styles.wotwSystemMessageText}>
              {"// UNABLE_TO_LOAD_WEEKLY_CHALLENGE"}
            </Text>
          </View>
        ) : workoutOfTheWeekOccurrence ? (
          <View style={styles.wotwCard}>
            <View style={styles.wotwTopBar}>
              <View style={styles.wotwStatus}>
                <View
                  style={[
                    styles.wotwStatusDot,
                    {
                      backgroundColor: accent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.wotwStatusText,
                    {
                      color: accent,
                    },
                  ]}
                >
                  {workoutOfTheWeekSession?.status === "active"
                    ? "WOTW // IN_PROGRESS"
                    : workoutOfTheWeekSession?.status === "completed"
                      ? "WOTW // COMPLETED"
                      : workoutOfTheWeekSession?.status === "cancelled"
                        ? "WOTW // CANCELLED"
                        : "WOTW // ACTIVE"}
                </Text>
              </View>

              <Text style={styles.sectionBadge}>
                {workoutOfTheWeekRemainingSeconds > 0
                  ? formatRemainingTime(workoutOfTheWeekRemainingSeconds)
                  : "EXPIRED"}
              </Text>
            </View>

            <View style={styles.wotwTitleArea}>
              <Text style={styles.wotwName}>
                {workoutOfTheWeekOccurrence.name}
              </Text>

              <Text style={styles.wotwDescription} numberOfLines={2}>
                {workoutOfTheWeekOccurrence.description}
              </Text>
            </View>

            <View style={styles.wotwStats}>
              <View style={styles.wotwStat}>
                <Text style={styles.statLabel}>EXERCISES</Text>

                <Text style={styles.statValue}>
                  {workoutOfTheWeekOccurrence.exercises.length}
                </Text>
              </View>

              <View style={styles.wotwStatDivider} />

              <View style={styles.wotwStat}>
                <Text style={styles.statLabel}>DIFFICULTY</Text>

                <Text style={styles.statValue}>
                  {formatDifficulty(workoutOfTheWeekOccurrence.difficulty)}
                </Text>
              </View>

              <View style={styles.wotwStatDivider} />

              <View style={styles.wotwStat}>
                <Text style={styles.statLabel}>BONUS_XP</Text>

                <Text
                  style={[
                    styles.bonusValue,
                    {
                      color: accent,
                    },
                  ]}
                >
                  +{workoutOfTheWeekOccurrence.bonusXP}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={() => router.push("/workout-of-the-week")}
              style={({ pressed }) => [
                styles.startWorkoutButton,
                {
                  borderColor: accent,
                },
                pressed ? styles.startWorkoutButtonPressed : null,
              ]}
            >
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.buttonMarker,
                      {
                        backgroundColor: accent,
                        opacity: pressed ? 1 : 0.7,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.startWorkoutText,
                      {
                        color: accent,
                      },
                    ]}
                  >
                    VIEW_WORKOUT
                  </Text>

                  <Text
                    style={[
                      styles.buttonArrow,
                      {
                        color: accent,
                      },
                    ]}
                  >
                    →
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.wotwSystemMessage}>
            <Text style={styles.wotwSystemMessageText}>
              {"// NO_ACTIVE_WEEKLY_CHALLENGE"}
            </Text>
          </View>
        )}

        {/* RECENT ACTIVITY */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>ACTIVITY_FEED</Text>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          <Text style={styles.sectionNumber}>03</Text>
        </View>

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <View style={styles.activityStatus}>
              <View
                style={[
                  styles.activityStatusDot,
                  {
                    backgroundColor: accent,
                  },
                ]}
              />

              <Text style={styles.activityStatusText}>LATEST_UPDATES</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.viewAllButton,
                pressed ? styles.viewAllPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.viewAll,
                  {
                    color: accent,
                  },
                ]}
              >
                VIEW_ALL →
              </Text>
            </Pressable>
          </View>

          <View style={styles.activityList}>
            {recentActivity.map((activity, index) => (
              <ActivityRow
                key={activity.id}
                name={activity.name}
                date={activity.date}
                xp={activity.xp}
                accentColor={accent}
                isLast={index === recentActivity.length - 1}
              />
            ))}
          </View>
        </View>

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

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  systemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  systemStatusText: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  levelCode: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  greeting: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },

  username: {
    color: Colors.dark.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 1,
  },

  headerLine: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 18,
  },

  headerLineAccent: {
    width: 44,
    height: 2,
    position: "absolute",
    top: -1,
    left: 0,
  },

  /* SECTION HEADERS */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },

  sectionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
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

  dataLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  /* HUD DETAILS */

  hudCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },

  hudCornerBR: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },

  /* PROGRESSION */

  progressCard: {
    position: "relative",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    padding: 18,
    marginBottom: 30,
  },

  progressTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressStat: {
    flex: 1,
  },

  verticalDivider: {
    width: 1,
    height: 34,
    backgroundColor: Colors.dark.borderSubtle,
    marginHorizontal: 12,
  },

  factionName: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 5,
  },

  progressValue: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },

  progressDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 18,
    marginBottom: 17,
  },

  xpSection: {},

  xpTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  xpLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  xpRemaining: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  xpTrack: {
    position: "relative",
    height: 4,
    backgroundColor: Colors.dark.borderSubtle,
  },

  xpFill: {
    height: "100%",
  },

  xpTip: {
    position: "absolute",
    width: 2,
    height: 10,
    top: -3,
    marginLeft: -1,
  },

  xpFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  xpFooterText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "700",
  },

  xpPercent: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* WORKOUT OF THE WEEK */

  wotwCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 30,
  },

  wotwSystemMessage: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 30,
  },

  wotwSystemMessageText: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  wotwTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  wotwStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  wotwStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  wotwStatusText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  sectionBadge: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  wotwTitleArea: {
    marginBottom: 20,
  },

  wotwName: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  wotwDescription: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: "90%",
  },

  wotwStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  wotwStat: {
    flex: 1,
  },

  wotwStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.dark.borderSubtle,
    marginHorizontal: 10,
  },

  statLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  statValue: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },

  bonusValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },

  divider: {
    height: 1,
    width: "100%",
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 18,
    marginBottom: 14,
  },

  startWorkoutButton: {
    position: "relative",
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    paddingHorizontal: 14,
  },

  startWorkoutButtonPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    transform: [{ scale: 0.99 }],
  },

  buttonMarker: {
    width: 3,
    height: 18,
  },

  startWorkoutText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  buttonArrow: {
    fontSize: 16,
    fontWeight: "900",
  },

  /* ACTIVITY */

  activitySection: {
    marginBottom: 8,
  },

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundSelected,
    paddingHorizontal: 12,
  },

  activityStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  activityStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  activityStatusText: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  viewAllButton: {
    paddingVertical: 6,
    paddingLeft: 10,
  },

  viewAllPressed: {
    opacity: 0.55,
  },

  viewAll: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  activityList: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
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

const recentActivity = [
  {
    id: "1",
    name: "NovaRift sent you a friend request",
    date: "Today",
    xp: 0,
  },
  {
    id: "2",
    name: "Your faction moved up in the standings",
    date: "Today",
    xp: 0,
  },
  {
    id: "3",
    name: "New Workout of the Week is now active",
    date: "Yesterday",
    xp: 0,
  },
];
