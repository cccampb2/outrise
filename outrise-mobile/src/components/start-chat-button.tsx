import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrCreateConversation } from "@/api/messages";
import { MessageButton, messagingError } from "@/components/messaging-ui";

export function StartChatButton({
  userId,
  username,
  disabled = false,
}: {
  userId: string;
  username: string;
  disabled?: boolean;
}) {
  const mounted = useRef(true);
  const client = useQueryClient();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mutation = useMutation({
    mutationFn: () => getOrCreateConversation(userId),
    retry: false,
    onSuccess: ({ conversation }) => {
      void client.invalidateQueries({ queryKey: ["conversations"] });
      if (mounted.current)
        router.push({
          pathname: "/messages/[conversationId]",
          params: { conversationId: conversation._id, username },
        });
    },
    onError: (error) => {
      if (mounted.current) Alert.alert("Messages", messagingError(error));
    },
  });
  return (
    <MessageButton
      label={mutation.isPending ? "OPENING…" : "MESSAGE"}
      disabled={disabled || mutation.isPending}
      onPress={() => mutation.mutate()}
    />
  );
}
