import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getUnreadMessageCount } from "@/api/messages";
import { getUnreadSystemMessageCount } from "@/api/system-messages";

export function useMessageCount(userId?: string) {
  const query = useQuery({
    queryKey: ["conversations", userId, "unread-count"],
    queryFn: async () => {
      const [messages, announcements] = await Promise.all([
        getUnreadMessageCount(),
        getUnreadSystemMessageCount(),
      ]);
      return { unreadCount: messages.unreadCount + announcements.unreadCount };
    },
    enabled: Boolean(userId),
    refetchInterval: 30000,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (userId) void refetch();
    }, [userId, refetch]),
  );
  return query;
}
