import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import {
  getSystemMessages,
  getSystemMessage,
  getSystemMessageSummary,
  markSystemMessagesRead,
} from "@/api/system-messages";

export function useSystemMessages(enabled = true) {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  return useInfiniteQuery({
    queryKey: ["system-messages", userId, "list"],
    queryFn: ({ pageParam }) => getSystemMessages(pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
    enabled: Boolean(userId) && enabled,
    refetchInterval: 30000,
  });
}

export function useSystemMessage(messageId: string) {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  return useQuery({
    queryKey: ["system-messages", userId, "detail", messageId],
    queryFn: () => getSystemMessage(messageId),
    enabled: Boolean(userId) && /^[a-f\d]{24}$/i.test(messageId),
  });
}

export function useSystemMessageSummary() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const query = useQuery({
    queryKey: ["system-messages", userId, "summary"],
    queryFn: getSystemMessageSummary,
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

export function useMarkSystemMessagesRead() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const client = useQueryClient();
  return useMutation({
    mutationFn: markSystemMessagesRead,
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["system-messages", userId] }),
        client.invalidateQueries({ queryKey: ["notifications", userId] }),
        client.invalidateQueries({ queryKey: ["conversations", userId] }),
      ]);
    },
  });
}
