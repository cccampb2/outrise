import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getUnreadMessageCount } from "@/api/messages";

export function useMessageCount(userId?: string) {
  const query = useQuery({
    queryKey: ["conversations", userId, "unread-count"],
    queryFn: getUnreadMessageCount,
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
