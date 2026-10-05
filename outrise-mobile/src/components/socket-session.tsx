import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { socket } from "@/api/socket";
import { getToken } from "@/storage/auth-storage";
import type { RootState } from "@/store/store";
import type { Message } from "@/api/messages";
import { useQueryClient } from "@tanstack/react-query";
import { AppState, Pressable, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "@/components/app-text";
import { Colors } from "@/constants/theme";

export function SocketSession() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  const emailVerified = useSelector(
    (state: RootState) => state.auth.user?.emailVerified,
  );

  const client = useQueryClient();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const currentPath = useRef(pathname);
  useEffect(() => { currentPath.current = pathname; }, [pathname]);
  const [notice, setNotice] = useState<(Message & { recipientUserId: string }) | null>(null);
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
        if (seenMessages.current.size > 500) seenMessages.current.delete(seenMessages.current.values().next().value!);
        if (AppState.currentState === "active" && currentPath.current !== `/messages/${message.conversation}`) setNotice({ ...message, recipientUserId: userId });
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
      socket.disconnect();
      socket.auth = {};
    };
  }, [userId, emailVerified, client]);

  if (!notice || notice.recipientUserId !== userId || !userId || !emailVerified || pathname === `/messages/${notice.conversation}`) return null;
  return <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, zIndex: 1000, elevation: 20,
    backgroundColor: Colors.dark.backgroundSelected, borderWidth: 1, borderColor: Colors.dark.borderStrong, flexDirection: "row" }}>
    <Pressable accessibilityRole="button" accessibilityLabel="New message. Open conversation." onPress={() => {
      const conversationId = notice.conversation; setNotice(null); router.push({ pathname: "/messages/[conversationId]", params: { conversationId } });
    }} style={{ flex: 1, padding: 14, minHeight: 56 }}>
      <Text style={{ color: Colors.dark.text, fontWeight: "800", fontSize: 14 }}>NEW MESSAGE</Text>
      <Text style={{ color: Colors.dark.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={1}>{notice.text}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message alert" onPress={() => setNotice(null)}
      style={{ width: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}><Text style={{ color: Colors.dark.text }}>×</Text></Pressable>
  </View>;
}
