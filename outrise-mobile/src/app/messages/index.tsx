import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSelector } from "react-redux";
import { useConversations } from "@/hooks/use-conversations";
import { AppText as Text } from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import {
  MessageButton,
  messagingError,
  messageStyles as styles,
} from "@/components/messaging-ui";
import { Colors } from "@/constants/theme";
import type { RootState } from "@/store/store";
import { useSystemMessageSummary } from "@/hooks/use-system-messages";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function MessagesScreen() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const query = useConversations();
  const announcements = useSystemMessageSummary();
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const rows = query.data?.pages.flatMap((page) => page.conversations) ?? [];
  const conversations = rows.filter(
    (row, index) => rows.findIndex((other) => other._id === row._id) === index,
  );
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.actions}>
          <MessageButton
            label="← BACK"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/community")
            }
          />
          <MessageButton
            label="NEW CHAT"
            onPress={() => router.push("/friends")}
          />
        </View>
        <BrandHeader label="MESSAGES" />
        <Text style={styles.title}>YOUR INBOX</Text>
        <Text style={styles.subtitle}>
          Stay connected with your training circle.
        </Text>
      </View>
      <FlatList
        style={styles.list}
        data={conversations}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.inboxContent}
        showsVerticalScrollIndicator={false}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => {
          void Promise.all([query.refetch(), announcements.refetch()]);
        }}
        ListHeaderComponent={
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Outrise announcements${announcements.data?.unreadCount ? `, ${announcements.data.unreadCount} unread` : ""}`}
              onPress={() => router.push("/messages/announcements")}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.avatar}>
                <Ionicons
                  name="megaphone-outline"
                  size={23}
                  color={Colors.dark.accent}
                />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.name}>OUTRISE</Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {announcements.isError
                    ? "Updates unavailable"
                    : announcements.isPending
                      ? "Checking announcements…"
                      : (announcements.data?.latest?.title ??
                        "Official announcements")}
                </Text>
              </View>
              {announcements.data && announcements.data.unreadCount > 0 && (
                <View
                  accessibilityLabel={`${announcements.data.unreadCount} unread announcements`}
                  style={styles.unreadBadge}
                >
                  <Text style={styles.unreadCount}>
                    {announcements.data.unreadCount > 99
                      ? "99+"
                      : announcements.data.unreadCount}
                  </Text>
                </View>
              )}
              <Text style={styles.subtitle}>→</Text>
            </Pressable>
            {announcements.isError && (
              <View style={styles.state}>
                <Text accessibilityRole="alert" style={styles.error}>
                  {messagingError(announcements.error)}
                </Text>
                <MessageButton
                  label="RETRY ANNOUNCEMENTS"
                  onPress={() => {
                    void announcements.refetch();
                  }}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const other =
            item.userLow?._id === userId ? item.userHigh : item.userLow;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open chat with ${other?.username ?? "deleted account"}`}
              onPress={() =>
                router.push({
                  pathname: "/messages/[conversationId]",
                  params: {
                    conversationId: item._id,
                    username: other?.username ?? "Deleted account",
                  },
                })
              }
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.avatar}>
                {other?.profileImage?.url ? (
                  <Image
                    source={{ uri: other.profileImage.url }}
                    style={styles.avatar}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {other?.username?.slice(0, 1).toUpperCase() ?? "?"}
                  </Text>
                )}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {other?.username ?? "Deleted account"}
                </Text>
                <Text style={styles.meta}>
                  {item.lastMessageAt
                    ? new Date(item.lastMessageAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Start the conversation"}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View
                  accessibilityLabel={`${item.unreadCount} unread messages`}
                  style={styles.unreadBadge}
                >
                  <Text style={styles.unreadCount}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Text>
                </View>
              )}
              <Text style={styles.subtitle}>→</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.state}>
            {query.isPending ? (
              <ActivityIndicator color={Colors.dark.accent} />
            ) : (
              !query.isError && (
                <>
                  <Text style={styles.name}>No friend conversations yet</Text>
                  <Text style={styles.subtitle}>
                    Choose an accepted friend to start a chat.
                  </Text>
                  <MessageButton
                    label="FIND YOUR FRIENDS"
                    onPress={() => router.push("/friends")}
                  />
                </>
              )
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.state}>
            {query.isError && (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  {messagingError(query.error)}
                </Text>
                <MessageButton
                  label="RETRY"
                  onPress={() => {
                    if (query.isFetchNextPageError) void query.fetchNextPage();
                    else void query.refetch();
                  }}
                />
              </>
            )}
            {query.isFetchingNextPage ? (
              <ActivityIndicator color={Colors.dark.accent} />
            ) : (
              query.hasNextPage &&
              !query.isError && (
                <MessageButton
                  label="LOAD MORE"
                  disabled={query.isFetching}
                  onPress={() => {
                    void query.fetchNextPage();
                  }}
                />
              )
            )}
          </View>
        }
      />
    </Screen>
  );
}
