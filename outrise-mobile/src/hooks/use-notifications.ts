import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, getUnreadNotificationCount, updateNotifications } from "@/api/notifications";

export function useNotificationCount(userId?: string) {
  const query = useQuery({ queryKey: ["notifications", userId, "count"], queryFn: getUnreadNotificationCount, enabled: Boolean(userId), refetchInterval: 30000 });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (userId) void refetch(); }, [userId, refetch]));
  return query;
}

export function useNotifications(userId?: string, unreadOnly = false) {
  const client = useQueryClient();
  const query = useInfiniteQuery({ queryKey: ["notifications", userId, "list", unreadOnly], queryFn: ({ pageParam }) => getNotifications(pageParam, unreadOnly), initialPageParam: 1, getNextPageParam: (page) => page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined, enabled: Boolean(userId), refetchInterval: 30000 });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (userId) void refetch(); }, [userId, refetch]));
  const mutation = useMutation({ mutationFn: ({ action, id }: { action: "read" | "dismiss"; id?: string }) => updateNotifications(action, id), onSettled: async () => { await client.invalidateQueries({ queryKey: ["notifications", userId] }); } });
  return { query, notifications: query.data?.pages.flatMap((page) => page.notifications) ?? [], mutation, markRead: (id?: string) => mutation.mutateAsync({ action: "read", id }), dismiss: (id?: string) => mutation.mutateAsync({ action: "dismiss", id }) };
}
