import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import {
  useNotifications,
  useNotificationCount,
} from "@/hooks/use-notifications";
import type { Notification } from "@/api/notifications";
import { ApiError } from "@/api/client";
import type { RootState } from "@/store/store";

function presentation(item: Notification) {
  switch (item.type) {
    case "message_received":
      return {
        title: "New message",
        message: `${item.details.actorUsername} sent you a message.`,
        icon: "chatbubble-outline" as const,
      };
    case "friend_request_received":
      return {
        title: "New friend request",
        message: `${item.details.actorUsername} wants to join your friends list.`,
        icon: "person-add-outline" as const,
      };
    case "friend_request_accepted":
      return {
        title: "Friend request accepted",
        message: `${item.details.actorUsername} accepted your friend request.`,
        icon: "people-outline" as const,
      };
    case "verification_approved":
      return {
        title: "Performance approved",
        message: `Your ${item.details.exerciseName} performance has been verified.`,
        icon: "checkmark-circle-outline" as const,
      };
    case "verification_rejected":
      return {
        title: "Verification needs attention",
        message: `Your ${item.details.exerciseName} verification was rejected. Tap to review the reason.`,
        icon: "alert-circle-outline" as const,
      };
    case "wotw_launched":
      return {
        title: "New Workout of the Week",
        message: `${item.details.workoutName} is live. Take on this week’s challenge.`,
        icon: "barbell-outline" as const,
      };
    default:
      return {
        title: "Your faction won the season",
        message: `${item.details.factionName} won Season ${item.details.seasonNumber}!`,
        icon: "trophy-outline" as const,
      };
  }
}

export default function NotificationsScreen() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const {
    query,
    notifications: visible,
    mutation,
    markRead,
    dismiss,
  } = useNotifications(userId, unreadOnly);
  const countQuery = useNotificationCount(userId);
  const unreadCount = countQuery.data?.unreadCount;
  const hasUnread =
    unreadCount === undefined
      ? visible.some((item) => !item.read)
      : unreadCount > 0;
  async function openNotification(item: Notification) {
    try {
      await markRead(item._id);
      if (item.type === "message_received")
        router.push({
          pathname: "/messages/[conversationId]",
          params: {
            conversationId: item.details.conversationId,
            username: item.details.actorUsername,
          },
        });
      else if (
        item.type === "friend_request_received" ||
        item.type === "friend_request_accepted"
      )
        router.push("/friends");
      else if (
        item.type === "verification_approved" ||
        item.type === "verification_rejected"
      )
        router.push({
          pathname: "/verifications/[verification]",
          params: { verification: item.sourceId },
        });
      else if (item.type === "wotw_launched")
        router.push("/workout-of-the-week");
      else router.push("/(tabs)/rankings");
    } catch {
      /* Mutation error is displayed below. */
    }
  }
  function clearNotification(id?: string) {
    void dismiss(id).catch(() => {});
  }
  return (
    <Screen scroll bottomInSet={24}>
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.dark.text} />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>
        <BrandHeader label="INBOX" />
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Ionicons
            name="notifications-outline"
            size={26}
            color={Colors.dark.accent}
          />
        </View>
        <Text style={styles.subtitle}>
          {countQuery.isError
            ? "Unread count unavailable"
            : unreadCount === undefined
              ? "Checking notifications..."
              : unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "You’re all caught up"}
        </Text>
        {countQuery.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void countQuery.refetch();
            }}
            style={styles.back}
          >
            <Text style={styles.action}>RETRY UNREAD COUNT</Text>
          </Pressable>
        )}
        <View style={styles.tools}>
          <View style={styles.filters}>
            {[false, true].map((unread) => (
              <Pressable
                key={String(unread)}
                accessibilityRole="button"
                accessibilityState={{ selected: unreadOnly === unread }}
                onPress={() => setUnreadOnly(unread)}
                style={[
                  styles.filter,
                  unreadOnly === unread && styles.activeFilter,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    unreadOnly === unread && styles.activeText,
                  ]}
                >
                  {unread ? "UNREAD" : "ALL"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!hasUnread || mutation.isPending}
            onPress={() => {
              void markRead().catch(() => {});
            }}
            style={styles.markAll}
          >
            <Text style={[styles.action, !hasUnread && styles.muted]}>
              MARK ALL READ
            </Text>
          </Pressable>
        </View>
        {(visible.length > 0 || hasUnread) && (
          <Pressable
            accessibilityRole="button"
            disabled={mutation.isPending}
            onPress={() => clearNotification()}
            style={styles.clearAll}
          >
            <Text style={styles.action}>CLEAR ALL</Text>
          </Pressable>
        )}
        {query.isPending && <ActivityIndicator color={Colors.dark.accent} />}
        {query.isError && (
          <Pressable
            onPress={() => {
              void query.refetch();
            }}
            style={styles.back}
          >
            <Text style={styles.error}>
              Unable to load notifications. Tap to retry.
            </Text>
          </Pressable>
        )}
        {mutation.isError && (
          <Text style={styles.error}>
            {mutation.error instanceof ApiError
              ? mutation.error.getDisplayMessage()
              : "Unable to update notifications."}
          </Text>
        )}
        {visible.map((notification) => {
          const item = { ...notification, ...presentation(notification) };
          return (
            <Pressable
              key={item._id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.message}. ${item.read ? "Read" : "Unread"}. Tap to open.`}
              disabled={mutation.isPending}
              onPress={() => {
                void openNotification(notification);
              }}
              style={({ pressed }) => [
                styles.card,
                !item.read && styles.unreadCard,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.icon, !item.read && styles.unreadIcon]}>
                <Ionicons
                  name={item.icon}
                  size={21}
                  color={item.read ? Colors.dark.textMuted : Colors.dark.accent}
                />
              </View>
              <View style={styles.content}>
                <View style={styles.cardHeader}>
                  <Text
                    style={[styles.cardTitle, item.read && styles.readTitle]}
                  >
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>
                  {new Date(item.occurredAt).toLocaleString()}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dismiss ${item.title}`}
                disabled={mutation.isPending}
                onPress={(event) => {
                  event.stopPropagation();
                  clearNotification(item._id);
                }}
                style={styles.dismiss}
              >
                <Ionicons
                  name="close-outline"
                  size={20}
                  color={Colors.dark.textMuted}
                />
              </Pressable>
            </Pressable>
          );
        })}
        {query.hasNextPage && (
          <Pressable
            disabled={query.isFetching}
            onPress={() => {
              void query.fetchNextPage();
            }}
            style={styles.back}
          >
            <Text style={styles.action}>
              {query.isFetching ? "LOADING..." : "SEE MORE"}
            </Text>
          </Pressable>
        )}
        {!query.isPending && !query.isError && visible.length === 0 && (
          <View style={styles.empty}>
            <Ionicons
              name="checkmark-done-outline"
              size={36}
              color={Colors.dark.textMuted}
            />
            <Text style={styles.cardTitle}>All caught up</Text>
            <Text style={styles.message}>
              {unreadOnly ? "No unread notifications." : "No notifications."}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 8 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "800",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 8 },
  error: { color: Colors.dark.accent, fontSize: 12, marginBottom: 12 },
  tools: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 18,
    gap: 8,
  },
  filters: { flexDirection: "row", gap: 6 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  activeFilter: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSelected,
  },
  filterText: { color: Colors.dark.textMuted, fontSize: 10, fontWeight: "800" },
  activeText: { color: Colors.dark.accent },
  markAll: { minHeight: 44, justifyContent: "center" },
  clearAll: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  dismiss: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
    marginTop: -8,
  },
  action: { color: Colors.dark.accent, fontSize: 9, fontWeight: "800" },
  muted: { color: Colors.dark.textDim },
  card: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 10,
  },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: Colors.dark.accent },
  icon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundDeep,
  },
  unreadIcon: { backgroundColor: Colors.dark.backgroundSelected },
  content: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  readTitle: { color: Colors.dark.textSecondary },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },
  message: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  time: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    marginTop: 10,
    letterSpacing: 0.4,
  },
  empty: { alignItems: "center", gap: 12, paddingVertical: 50 },
});
