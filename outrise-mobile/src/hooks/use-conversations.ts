import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getConversations } from "@/api/messages";
import type { RootState } from "@/store/store";

export function useConversations() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  return useInfiniteQuery({
    queryKey: ["conversations", userId],
    queryFn: ({ pageParam }) => getConversations(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    enabled: Boolean(userId),
  });
}
