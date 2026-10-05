import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getConversationMessages } from "@/api/messages";
import type { RootState } from "@/store/store";

export function useConversationMessages(conversationId: string) {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  return useInfiniteQuery({
    queryKey: ["messages", userId, conversationId],
    queryFn: ({ pageParam }) =>
      getConversationMessages(conversationId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    enabled: Boolean(userId) && /^[a-f\d]{24}$/i.test(conversationId),
  });
}
