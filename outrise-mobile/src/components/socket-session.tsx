import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { socket } from "@/api/socket";
import { getToken } from "@/storage/auth-storage";
import type { RootState } from "@/store/store";
import type { Message } from "@/api/messages";
import { getSystemMessage, type SystemMessage } from "@/api/system-messages";
import { useQueryClient } from "@tanstack/react-query";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { router, usePathname, useGlobalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "@/components/app-text";
import { Colors } from "@/constants/theme";

type Notice =
  | (Message & { kind: "message"; recipientUserId: string })
  | (SystemMessage & { kind: "announcement"; recipientUserId: string });

export function SocketSession() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  const emailVerified = useSelector(
    (state: RootState) => state.auth.user?.emailVerified,
  );

  const client = useQueryClient();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ messageId?: string }>();
  const announcementId =
    typeof params.messageId === "string" ? params.messageId : "";
  const insets = useSafeAreaInsets();
  const currentPath = useRef(pathname);
  const currentAnnouncementId = useRef(announcementId);
  useEffect(() => {
    currentPath.current = pathname;
    currentAnnouncementId.current = announcementId;
  }, [pathname, announcementId]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const seenMessages = useRef(new Set<string>());
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!userId || !emailVerified) {
      return;
    }

    seenMessages.current.clear();
    let cancelled = false;

    const onConnect = () => {
      console.log("Socket connected:", socket.id);
      void client.invalidateQueries({ queryKey: ["system-messages", userId] });
      void client.invalidateQueries({ queryKey: ["notifications", userId] });

      void client.invalidateQueries({
        queryKey: ["messages", userId],
      });

      void client.invalidateQueries({
        queryKey: ["conversations", userId],
      });
    };

    const onDisconnect = (reason: string) => {
      console.log("Socket disconnected:", reason);
    };

    const onConnectError = (error: Error) => {
      console.log("Socket connection failed:", error.message);
    };

    const onNewMessage = (message: Message) => {
      console.log("New message received:", message);
      void client.invalidateQueries({ queryKey: ["notifications", userId] });
      if (message.sender !== userId && !seenMessages.current.has(message._id)) {
        seenMessages.current.add(message._id);
        if (seenMessages.current.size > 500)
          seenMessages.current.delete(
            seenMessages.current.values().next().value!,
          );
        if (
          AppState.currentState === "active" &&
          currentPath.current !== `/messages/${message.conversation}`
        )
          setNotice({ ...message, kind: "message", recipientUserId: userId });
      }

      void client.invalidateQueries({
        queryKey: ["messages", userId, message.conversation],
      });

      void client.invalidateQueries({
        queryKey: ["conversations", userId],
      });
    };
    const onMessagesRead = () => {
      void client.invalidateQueries({ queryKey: ["conversations", userId] });
      void client.invalidateQueries({ queryKey: ["notifications", userId] });
    };
    const refreshAnnouncements = () => {
      void client.invalidateQueries({ queryKey: ["system-messages", userId] });
      void client.invalidateQueries({ queryKey: ["notifications", userId] });
      void client.invalidateQueries({ queryKey: ["conversations", userId] });
    };
    const isViewingAnnouncement = (messageId: string) =>
      currentPath.current === "/messages/announcements" &&
      (!currentAnnouncementId.current ||
        currentAnnouncementId.current === messageId);
    const onNewAnnouncement = async ({ messageId }: { messageId: string }) => {
      refreshAnnouncements();
      if (typeof messageId !== "string" || !/^[a-f\d]{24}$/i.test(messageId))
        return;
      const key = `announcement:${messageId}`;
      if (seenMessages.current.has(key)) return;
      seenMessages.current.add(key);
      if (seenMessages.current.size > 500)
        seenMessages.current.delete(
          seenMessages.current.values().next().value!,
        );
      if (
        AppState.currentState !== "active" ||
        isViewingAnnouncement(messageId)
      )
        return;
      try {
        const { systemMessage } = await getSystemMessage(messageId);
        if (
          !cancelled &&
          !systemMessage.read &&
          AppState.currentState === "active" &&
          !isViewingAnnouncement(messageId)
        ) {
          setNotice({
            ...systemMessage,
            kind: "announcement",
            recipientUserId: userId,
          });
        }
      } catch {
        // The saved announcement remains available if its live preview cannot load.
      }
    };
    socket.on("announcement:new", onNewAnnouncement);
    socket.on("announcements:read", refreshAnnouncements);
    socket.on("notifications:updated", refreshAnnouncements);
    socket.on("messages:read", onMessagesRead);
    socket.on("message:new", onNewMessage);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    async function connect() {
      try {
        const token = await getToken();

        if (cancelled || !token || AppState.currentState !== "active") {
          return;
        }

        socket.auth = { token };
        socket.connect();
      } catch (error) {
        console.error("Unable to start socket connection:", error);
      }
    }

    void connect();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void connect();
        } else {
          socket.disconnect();
        }
      },
    );

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("message:new", onNewMessage);
      socket.off("messages:read", onMessagesRead);
      socket.off("announcement:new", onNewAnnouncement);
      socket.off("announcements:read", refreshAnnouncements);
      socket.off("notifications:updated", refreshAnnouncements);
      socket.disconnect();
      socket.auth = {};
    };
  }, [userId, emailVerified, client]);

  if (
    !notice ||
    notice.recipientUserId !== userId ||
    !userId ||
    !emailVerified ||
    (notice.kind === "message"
      ? pathname === `/messages/${notice.conversation}`
      : pathname === "/messages/announcements" &&
        (!announcementId || announcementId === notice._id))
  )
    return null;
  return (
    <View style={[styles.notice, { top: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          notice.kind === "message"
            ? "New message. Open conversation."
            : "New Outrise announcement. Open announcement."
        }
        onPress={() => {
          const destination =
            notice.kind === "message"
              ? {
                  pathname: "/messages/[conversationId]" as const,
                  params: { conversationId: notice.conversation },
                }
              : {
                  pathname: "/messages/announcements" as const,
                  params: { messageId: notice._id },
                };
          setNotice(null);
          router.push(destination);
        }}
        style={styles.openButton}
      >
        <Text style={styles.title}>
          {notice.kind === "message" ? "NEW MESSAGE" : "OUTRISE ANNOUNCEMENT"}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {notice.kind === "message" ? notice.text : notice.title}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          notice.kind === "message"
            ? "Dismiss message alert"
            : "Dismiss announcement alert"
        }
        onPress={() => setNotice(null)}
        style={styles.dismissButton}
      >
        <Text style={styles.dismissText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 20,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    flexDirection: "row",
  },
  openButton: { flex: 1, padding: 14, minHeight: 56 },
  title: { color: Colors.dark.text, fontWeight: "800", fontSize: 14 },
  preview: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 4 },
  dismissButton: {
    width: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  dismissText: { color: Colors.dark.text },
});
