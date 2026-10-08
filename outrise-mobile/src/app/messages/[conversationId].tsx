import { BlockUserControls } from "@/components/block-user-controls";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendMessage, markConversationRead } from "@/api/messages";
import { ApiError } from "@/api/client";
import { useConversationMessages } from "@/hooks/use-conversation-messages";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import {
  MessageButton,
  messagingError,
  messageStyles as styles,
} from "@/components/messaging-ui";
import { Colors } from "@/constants/theme";
import type { RootState } from "@/store/store";
type Attempt = { text: string; idempotencyKey: string };

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    username?: string;
  }>();
  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : "";
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const [draft, setDraft] = useState("");
  const attempt = useRef<Attempt | null>(null);
  const busy = useRef(false);
  const query = useConversationMessages(conversationId);
  const validId = /^[a-f\d]{24}$/i.test(conversationId);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (validId) void refetch();
    }, [refetch, validId]),
  );
  const mutation = useMutation({
    mutationFn: (data: Attempt) => sendMessage(conversationId, data),
    retry: false,
    onSuccess: () => {
      attempt.current = null;
      setDraft("");
      void client.invalidateQueries({
        queryKey: ["messages", userId, conversationId],
      });
      void client.invalidateQueries({ queryKey: ["conversations", userId] });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const latestMessageId = query.data?.pages[0]?.messages[0]?._id;
  const [readError, setReadError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!latestMessageId || !validId) return;
      let cancelled = false;
      const acknowledge = async () => {
        if (AppState.currentState !== "active") return;
        try {
          await markConversationRead(conversationId, latestMessageId);
          if (!cancelled) setReadError(false);
          await Promise.all([
            client.invalidateQueries({ queryKey: ["conversations", userId] }),
            client.invalidateQueries({ queryKey: ["notifications", userId] }),
          ]);
        } catch {
          if (!cancelled) setReadError(true);
        }
      };
      void acknowledge();
      const interval = setInterval(() => {
        void acknowledge();
      }, 30000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [latestMessageId, validId, conversationId, client, userId]),
  );
  const rows = query.data?.pages.flatMap((page) => page.messages) ?? [];
  const messages = rows.filter(
    (row, index) => rows.findIndex((other) => other._id === row._id) === index,
  );
  const send = () => {
    const text = draft.trim();
    if (
      !text ||
      text.length > 2000 ||
      busy.current ||
      query.data?.pages[0]?.blocked ||
      query.data?.pages[0]?.conversationClosed
    )
      return;
    if (attempt.current?.text !== text) {
      attempt.current = {
        text,
        idempotencyKey: `message:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`,
      };
    }
    busy.current = true;
    mutation.mutate(attempt.current);
  };
  const blocking = query.data?.pages[0];
  const contactBlocked = blocking?.blocked === true;
  const conversationClosed = query.data?.pages[0]?.conversationClosed === true;
  const accessDenied =
    query.error instanceof ApiError && [403, 404].includes(query.error.status);
  return (
    <Screen keyboardAvoiding>
      <View style={styles.header}>
        <View style={styles.actions}>
          <MessageButton
            label="← INBOX"
            disabled={mutation.isPending}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/messages")
            }
          />
          <MessageButton
            label="REFRESH"
            disabled={query.isFetching || !validId}
            onPress={() => {
              void query.refetch();
            }}
          />
        </View>
        <BrandHeader label="MESSAGES" />
        <Text style={styles.name}>
          {conversationClosed
            ? "Deleted account"
            : typeof params.username === "string"
              ? params.username
              : "CONVERSATION"}
        </Text>
      </View>
      {blocking?.otherUserId && !conversationClosed && (
        <BlockUserControls
          userId={blocking.otherUserId}
          username={
            typeof params.username === "string" ? params.username : "this user"
          }
        />
      )}
      {readError && (
        <Text style={styles.subtitle}>
          Read status couldn’t sync. We’ll try again shortly.
        </Text>
      )}
      {!validId ? (
        <Text style={styles.error}>This conversation link is invalid.</Text>
      ) : (
        <>
          {query.isPending && <ActivityIndicator color={Colors.dark.accent} />}
          {query.isError && (
            <View style={styles.state}>
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
            </View>
          )}
          <FlatList
            style={styles.list}
            inverted
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.sender === userId
                    ? styles.ownBubble
                    : styles.otherBubble,
                ]}
              >
                <Text style={styles.message}>
                  {item.removedAt ? "Message removed" : item.text}
                </Text>
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                {item.sender && item.sender !== userId && !item.removedAt && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Report message"
                    hitSlop={8}
                    style={styles.reportAction}
                    onPress={() =>
                      router.push({
                        pathname: "/report-issue",
                        params: {
                          messageId: item._id,
                          messageText: item.text,
                          reportedUserId: item.sender,
                          reportedUsername:
                            typeof params.username === "string"
                              ? params.username
                              : "User",
                        },
                      })
                    }
                  >
                    <Text style={styles.reportText}>REPORT →</Text>
                  </Pressable>
                )}
              </View>
            )}
            ListEmptyComponent={
              !query.isPending && !query.isError ? (
                <View style={styles.state}>
                  <Text style={styles.subtitle}>
                    Start the conversation. Say hello!
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              query.isFetchingNextPage ? (
                <ActivityIndicator color={Colors.dark.accent} />
              ) : query.hasNextPage && !query.isError ? (
                <MessageButton
                  label="LOAD OLDER MESSAGES"
                  disabled={query.isFetching}
                  onPress={() => {
                    void query.fetchNextPage();
                  }}
                />
              ) : null
            }
          />
          <View
            style={[
              styles.composer,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            {conversationClosed ? (
              <Text style={styles.meta}>
                This account was deleted. You can read your messages, but this
                conversation is closed.
              </Text>
            ) : null}
            {contactBlocked && (
              <Text style={styles.meta}>
                Messages are disabled while either account has blocked the
                other. Your chat history is still available.
              </Text>
            )}
            {mutation.isError && (
              <Text accessibilityRole="alert" style={styles.error}>
                {messagingError(mutation.error)} Your text is kept here so you
                can try again.
              </Text>
            )}
            <TextInput
              accessibilityLabel="Message"
              placeholder={
                conversationClosed
                  ? "Conversation closed"
                  : contactBlocked
                    ? "Messaging unavailable"
                    : "Write a message…"
              }
              placeholderTextColor={Colors.dark.textMuted}
              style={styles.input}
              multiline
              maxLength={2000}
              value={draft}
              editable={
                !mutation.isPending &&
                !accessDenied &&
                !conversationClosed &&
                !contactBlocked
              }
              onChangeText={(text) => {
                setDraft(text);
                if (text.trim() !== attempt.current?.text) mutation.reset();
              }}
            />
            <View style={styles.actions}>
              <Text style={styles.meta}>{draft.length}/2,000</Text>
              <MessageButton
                label={
                  mutation.isPending
                    ? "SENDING…"
                    : mutation.isError
                      ? "RETRY SEND"
                      : "SEND"
                }
                disabled={
                  !draft.trim() ||
                  mutation.isPending ||
                  accessDenied ||
                  conversationClosed ||
                  contactBlocked ||
                  query.isPending
                }
                onPress={send}
              />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
