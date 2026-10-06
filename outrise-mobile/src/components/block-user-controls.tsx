import { Alert, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getBlockRelationship, setUserBlocked } from "@/api/blocks";
import { AppText as Text } from "@/components/app-text";
import {
  MessageButton,
  messagingError,
  messageStyles as styles,
} from "@/components/messaging-ui";
import type { RootState } from "@/store/store";

export function BlockUserControls({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const viewerId = useSelector((state: RootState) => state.auth.user?.id);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["blocking", viewerId, userId],
    queryFn: () => getBlockRelationship(userId),
    enabled: !!viewerId && viewerId !== userId,
  });
  const mutation = useMutation({
    mutationFn: (blocked: boolean) => setUserBlocked(userId, blocked),
    onSuccess: async () => {
      await client.invalidateQueries();
    },
    onError: (error) => Alert.alert("Account blocking", messagingError(error)),
  });
  if (!viewerId || viewerId === userId) return null;
  const change = () => {
    const unblock = query.data?.blockedByMe === true;
    Alert.alert(
      unblock ? "Unblock user?" : "Block user?",
      unblock
        ? `Allow contact with ${username} again? Your friendship will not be restored automatically.`
        : `Block ${username}? Any friendship or pending request will be removed. Neither of you can send messages or friend requests while blocked. Existing messages stay.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: unblock ? "Unblock" : "Block",
          style: unblock ? "default" : "destructive",
          onPress: () => mutation.mutate(!unblock),
        },
      ],
    );
  };
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      {query.isError ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {messagingError(query.error)}
          </Text>
          <MessageButton
            label="RETRY BLOCK CONTROLS"
            onPress={() => {
              void query.refetch();
            }}
          />
        </>
      ) : (
        <MessageButton
          label={
            mutation.isPending
              ? "UPDATING…"
              : query.isPending
                ? "LOADING BLOCK CONTROLS…"
                : query.data?.blockedByMe
                  ? "UNBLOCK USER"
                  : "BLOCK USER"
          }
          disabled={mutation.isPending || query.isPending}
          onPress={change}
        />
      )}
      {query.data?.blocked && (
        <Text style={styles.subtitle}>
          {query.data.blockedByMe
            ? "You blocked this user. Messages and friend requests are disabled."
            : "Contact with this user is unavailable."}
        </Text>
      )}
    </View>
  );
}
