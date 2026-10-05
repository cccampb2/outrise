import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AppText as Text } from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import { SystemMessageCard } from "@/components/system-message-card";
import {
  MessageButton,
  messagingError,
  messageStyles as styles,
} from "@/components/messaging-ui";
import { Colors } from "@/constants/theme";
import {
  useSystemMessages,
  useSystemMessage,
  useMarkSystemMessagesRead,
} from "@/hooks/use-system-messages";

export default function AnnouncementsScreen() {
  const params = useLocalSearchParams<{ messageId?: string }>();
  const messageId =
    typeof params.messageId === "string" ? params.messageId : "";
  const detailMode = Boolean(messageId);
  const validId = !detailMode || /^[a-f\d]{24}$/i.test(messageId);
  const list = useSystemMessages(!detailMode);
  const detail = useSystemMessage(messageId);
  const query = detailMode ? detail : list;
  const rows = detailMode
    ? detail.data
      ? [detail.data.systemMessage]
      : []
    : (list.data?.pages.flatMap((page) => page.messages) ?? []);
  const messages = [
    ...new Map(rows.map((message) => [message._id, message])).values(),
  ];
  const eventIds = messages
    .filter((message) => !message.read && message.eventId)
    .map((message) => message.eventId!)
    .join(",");
  const read = useMarkSystemMessagesRead();
  const { mutateAsync } = read;
  const acknowledging = useRef(false);
  const [readError, setReadError] = useState(false);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (validId) void refetch();
    }, [validId, refetch]),
  );
  useFocusEffect(
    useCallback(() => {
      if (!eventIds) {
        setReadError(false);
        return;
      }
      if (!validId || query.isError) return;
      let cancelled = false;
      const acknowledge = async () => {
        if (
          cancelled ||
          acknowledging.current ||
          AppState.currentState !== "active"
        )
          return;
        acknowledging.current = true;
        try {
          const ids = eventIds.split(",");
          for (let offset = 0; offset < ids.length; offset += 50) {
            if (cancelled) break;
            await mutateAsync(ids.slice(offset, offset + 50));
          }
          if (!cancelled) setReadError(false);
        } catch {
          if (!cancelled) setReadError(true);
        } finally {
          acknowledging.current = false;
        }
      };
      void acknowledge();
      const interval = setInterval(() => {
        void acknowledge();
      }, 30000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void acknowledge();
      });
      return () => {
        cancelled = true;
        clearInterval(interval);
        subscription.remove();
      };
    }, [eventIds, validId, query.isError, mutateAsync]),
  );
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.actions}>
          <MessageButton
            label="← INBOX"
            onPress={() => router.replace("/messages")}
          />
          {detailMode ? (
            <MessageButton
              label="VIEW ALL"
              onPress={() => router.replace("/messages/announcements")}
            />
          ) : (
            <MessageButton
              label="REFRESH"
              disabled={query.isFetching}
              onPress={() => {
                void refetch();
              }}
            />
          )}
        </View>
        <BrandHeader label="ANNOUNCEMENTS" />
        <Text style={styles.title}>OUTRISE</Text>
        <Text style={styles.subtitle}>
          Official updates from Outrise. This inbox is read-only.
        </Text>
      </View>
      {readError && (
        <Text accessibilityRole="alert" style={styles.subtitle}>
          Read status couldn’t sync. We’ll try again shortly.
        </Text>
      )}
      {!validId ? (
        <Text style={styles.error}>This announcement link is invalid.</Text>
      ) : (
        <FlatList
          style={styles.list}
          data={messages}
          keyExtractor={(message) => message._id}
          contentContainerStyle={styles.inboxContent}
          refreshing={query.isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          renderItem={({ item }) => <SystemMessageCard message={item} />}
          ListEmptyComponent={
            <View style={styles.state}>
              {query.isPending ? (
                <ActivityIndicator color={Colors.dark.accent} />
              ) : (
                !query.isError && (
                  <Text style={styles.subtitle}>
                    No announcements yet. Updates from Outrise will appear here.
                  </Text>
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
                      if (!detailMode && list.isFetchNextPageError)
                        void list.fetchNextPage();
                      else void refetch();
                    }}
                  />
                </>
              )}
              {!detailMode && !list.isError && list.hasNextPage && (
                <MessageButton
                  label={
                    list.isFetchingNextPage
                      ? "LOADING…"
                      : "LOAD OLDER ANNOUNCEMENTS"
                  }
                  disabled={list.isFetching}
                  onPress={() => {
                    void list.fetchNextPage();
                  }}
                />
              )}
            </View>
          }
        />
      )}
    </Screen>
  );
}
