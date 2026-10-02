import { AppText as Text } from "@/components/app-text";
import { useState } from "react";
import { Alert, ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  dismissAllActivityEvents,
  dismissActivityEvents,
  getActivityFeed,
  type ActivityEvent,
} from "@/api/activity";
import { Colors } from "@/constants/theme";

function formatEventTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function activityActor(event: ActivityEvent, userId?: string) {
  if (event.actor && event.actor === userId) return "YOU";
  if ("actorUsername" in event.details) return event.details.actorUsername;
  if ("factionName" in event.details) return event.details.factionName;
  return "OUTRISE";
}

const activityCategories: Record<ActivityEvent["type"], string> = {
  friend_request_received: "FRIEND REQUEST",
  friend_request_accepted: "REQUEST ACCEPTED",
  personal_record_set: "PERSONAL RECORD",
  echelon_reached: "ECHELON REACHED",
  wotw_completed: "WORKOUT OF THE WEEK",
  achievement_unlocked: "ACHIEVEMENT UNLOCKED",
  workout_completed: "WORKOUT COMPLETED",
  verification_approved: "VERIFICATION APPROVED",
  verification_rejected: "VERIFICATION REJECTED",
  faction_rank_changed: "FACTION RANK",
  faction_first_place: "FIRST PLACE",
  faction_season_won: "SEASON WINNER",
  faction_milestone: "FACTION MILESTONE",
  wotw_launched: "NEW WORKOUT OF THE WEEK",
};
const activityIcons = {
  friend_request_received: "person-add-outline",
  friend_request_accepted: "person-add",
  personal_record_set: "trophy-outline",
  echelon_reached: "ribbon-outline",
  wotw_completed: "barbell-outline",
  achievement_unlocked: "medal-outline",
  workout_completed: "fitness-outline",
  verification_approved: "checkmark-circle-outline",
  verification_rejected: "close-circle-outline",
  faction_rank_changed: "stats-chart-outline",
  faction_first_place: "trophy-outline",
  faction_season_won: "trophy-outline",
  faction_milestone: "flag-outline",
  wotw_launched: "megaphone-outline",
} as const;

function activityMessage(event: ActivityEvent) {
  if (event.type === "verification_approved")
    return ` had your ${event.details.exerciseName} performance approved.`;
  if (event.type === "verification_rejected")
    return ` had your ${event.details.exerciseName} verification rejected. Tap to review the reason.`;
  if (event.type === "workout_completed") return " completed the workout: ";
  if (event.type === "wotw_launched")
    return ` launched a new Workout of the Week: ${event.details.workoutName}.`;
  if (event.type === "faction_rank_changed")
    return ` moved ${event.details.rank < event.details.previousRank ? "up" : "down"} from #${event.details.previousRank} to #${event.details.rank} in Season ${event.details.seasonNumber}.`;
  if (event.type === "faction_first_place")
    return ` took first place in Season ${event.details.seasonNumber}!`;
  if (event.type === "faction_season_won")
    return ` won Season ${event.details.seasonNumber}!`;
  if (event.type === "faction_milestone")
    return ` earned ${event.details.milestone.toLocaleString("en-US")} season XP in Season ${event.details.seasonNumber}!`;
  if (event.type === "achievement_unlocked")
    return ` unlocked ${event.details.achievementName}.`;
  if (event.type === "wotw_completed")
    return ` completed Workout of the Week: ${event.details.workoutName}.`;
  if (event.type === "echelon_reached")
    return ` reached Echelon ${event.details.echelon}.`;
  if (event.type !== "personal_record_set")
    return event.type === "friend_request_accepted"
      ? " accepted your friend request."
      : " sent you a friend request.";
  const { exerciseName, recordCategory, value, unit, distanceMiles } =
    event.details;
  const category = recordCategory?.replaceAll("_", " ");
  const distance =
    !category && distanceMiles != null ? ` (${distanceMiles} miles)` : "";
  const measurement =
    unit === "seconds"
      ? `${value.toLocaleString("en-US")} sec`
      : `${value.toLocaleString("en-US")} ${unit}`;
  return ` set a new ${exerciseName}${category ? ` (${category})` : distance} PR — ${measurement}.`;
}

type HomeActivityProps = {
  userId?: string;
  accentColor?: string;
};

export function HomeActivity({
  userId,
  accentColor = Colors.dark.accent,
}: HomeActivityProps) {
  function openEvent(event: ActivityEvent) {
    if (
      event.type === "verification_approved" ||
      event.type === "verification_rejected"
    ) {
      router.push({
        pathname: "/verifications/[verification]",
        params: { verification: event.sourceId },
      });
      return;
    }
    if (event.type === "wotw_launched") {
      router.push("/workout-of-the-week");
      return;
    }
    if (event.sourceType === "season") {
      router.push("/(tabs)/rankings");
      return;
    }
    if (event.type === "achievement_unlocked" && event.actor) {
      router.push({
        pathname: "/users/achievements",
        params: { userId: event.actor },
      });
      return;
    }
    if (
      event.type === "friend_request_received" ||
      event.type === "friend_request_accepted"
    ) {
      router.push("../friends");
      return;
    }
    if (event.actor)
      router.push({
        pathname: "/users/[userId]",
        params: { userId: event.actor },
      });
  }
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const dismissal = useMutation({
    mutationFn: (eventIds?: string[]) =>
      eventIds ? dismissActivityEvents(eventIds) : dismissAllActivityEvents(),
    onSuccess: (_data, eventIds) => {
      if (!eventIds) setExpanded(false);
    },
    onError: () =>
      Alert.alert("Activity", "Unable to clear activity. Please try again."),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activity", userId] });
    },
  });
  const query = useInfiniteQuery({
    queryKey: ["activity", userId],
    queryFn: ({ pageParam }) => getActivityFeed(pageParam, 4),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
    enabled: Boolean(userId),
  });
  const events = query.data?.pages.flatMap((page) => page.events) ?? [];
  const visibleEvents = expanded ? events : events.slice(0, 4);
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.label}>LATEST_UPDATES</Text>
        <Pressable
          accessibilityRole="button"
          disabled={query.isFetching || dismissal.isPending}
          onPress={() => {
            void query.refetch();
          }}
          style={styles.button}
        >
          <Text style={[styles.action, { color: accentColor }]}>
            {query.isRefetching ? "REFRESHING..." : "REFRESH"}
          </Text>
        </Pressable>
      </View>
      {events.length > 0 && (
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            disabled={dismissal.isPending}
            onPress={() => dismissal.mutate(undefined)}
            style={styles.button}
          >
            <Text style={[styles.action, { color: accentColor }]}>
              {dismissal.isPending && !dismissal.variables
                ? "CLEARING..."
                : "CLEAR ALL"}
            </Text>
          </Pressable>
        </View>
      )}
      {query.isPending ? (
        <ActivityIndicator color={accentColor} style={styles.state} />
      ) : events.length === 0 && !query.isError ? (
        <Text style={styles.empty}>
          No activity yet. Your updates, friends’ milestones, and faction news
          will appear here.
        </Text>
      ) : (
        visibleEvents.map((event) => (
          <View key={event._id} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              disabled={dismissal.isPending}
              onPress={() => openEvent(event)}
              style={({ pressed }) => [
                styles.eventContent,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name={activityIcons[event.type]}
                    size={18}
                    color={accentColor}
                  />
                </View>
                <View style={styles.eventHeading}>
                  <Text style={styles.eventCategory}>
                    {activityCategories[event.type]}
                  </Text>
                  <Text style={styles.actor} numberOfLines={1}>
                    {activityActor(event, userId)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.dark.textDim}
                />
              </View>
              <View style={styles.messageBox}>
                <Text style={styles.message}>
                  <Text style={styles.messageActor}>
                    {activityActor(event, userId)}
                  </Text>
                  {activityMessage(event)}
                  {event.type === "workout_completed" && (
                    <Text style={{ fontStyle: "italic" }}>
                      {event.details.workoutName}
                    </Text>
                  )}
                </Text>
              </View>
            </Pressable>
            <View style={styles.eventFooter}>
              <View style={styles.time}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={Colors.dark.textTechnical}
                />
                <Text style={styles.date}>
                  {formatEventTime(event.occurredAt)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Clear activity from ${activityActor(event, userId)}`}
                disabled={dismissal.isPending}
                onPress={() => dismissal.mutate([event._id])}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-outline"
                  size={14}
                  color={Colors.dark.textMuted}
                />
                <Text style={styles.clearText}>CLEAR</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      {query.isError && (
        <View style={styles.state}>
          <Text style={styles.empty}>Unable to load activity.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (query.isFetchNextPageError) void query.fetchNextPage();
              else void query.refetch();
            }}
            style={styles.button}
          >
            <Text style={[styles.action, { color: accentColor }]}>RETRY</Text>
          </Pressable>
        </View>
      )}
      {(expanded
        ? query.hasNextPage
        : events.length > 4 || query.hasNextPage) &&
        !query.isError && (
          <Pressable
            accessibilityRole="button"
            disabled={query.isFetching || dismissal.isPending}
            onPress={() => {
              setExpanded(true);
              if (query.hasNextPage && (expanded || events.length <= 4))
                void query.fetchNextPage();
            }}
            style={styles.button}
          >
            <Text style={[styles.action, { color: accentColor }]}>
              {query.isFetchingNextPage ? "LOADING..." : "SEE MORE →"}
            </Text>
          </Pressable>
        )}
      {expanded && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setExpanded(false);
          }}
          style={styles.button}
        >
          <Text style={[styles.action, { color: accentColor }]}>
            SHOW LESS ↑
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  label: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  action: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  row: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
    gap: 2,
  },
  eventHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  eventIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },
  eventHeading: { flex: 1, gap: 2 },
  eventCategory: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  actor: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  message: {
    color: Colors.dark.textSecondary,

    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
    letterSpacing: 0.15,
  },
  messageActor: { color: Colors.dark.text, fontWeight: "600" },
  eventContent: { gap: 8 },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  time: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  clearButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  clearText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 1,
  },
  messageBox: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.borderStrong,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  date: { color: Colors.dark.textMuted, fontSize: 10 },
  empty: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    padding: 16,
    lineHeight: 18,
  },
  state: { paddingVertical: 16, alignItems: "center" },
  pressed: { opacity: 0.5 },
});
