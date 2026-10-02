import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import type { PublicUser } from "@/api/users";
import { ApiError } from "@/api/client";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/api/friends";
import { Colors } from "@/constants/theme";

type FriendAction = "send" | "accept" | "decline" | "cancel" | "remove";

export function FriendshipControls({ user }: { user: PublicUser }) {
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (action: FriendAction) => {
      if (action === "send") return sendFriendRequest(user.id);
      if (action === "remove") return removeFriend(user.id);
      const requestId = user.relationship.requestId;
      if (!requestId) throw new Error("Request unavailable. Refresh the profile and try again.");
      if (action === "accept") return acceptFriendRequest(requestId);
      if (action === "decline") return declineFriendRequest(requestId);
      return cancelFriendRequest(requestId);
    },
    onError: (error) => {
      Alert.alert("Friend request", error instanceof ApiError ? error.getDisplayMessage() : error.message);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["public-user", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards", "friends"] }),
      ]);
    },
  });

  if (!currentUserId || currentUserId === user.id) return null;

  function confirmRemoval() {
    Alert.alert("Remove friend", `Remove ${user.username} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => mutation.mutate("remove") },
    ]);
  }

  function button(label: string, action: FriendAction, danger = false) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label.replaceAll("_", " ")}
        disabled={mutation.isPending}
        onPress={() => action === "remove" ? confirmRemoval() : mutation.mutate(action)}
        style={({ pressed }) => [styles.button, danger && styles.dangerButton, (pressed || mutation.isPending) && styles.dimmed]}
      >
        <Text style={[styles.buttonText, danger && styles.dangerText]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>FRIENDSHIP // {mutation.isPending ? "UPDATING..." : user.relationship.status.toUpperCase()}</Text>
      <View style={styles.actions}>
        {user.relationship.status === "none" && button("ADD_FRIEND", "send")}
        {user.relationship.status === "outgoing" && button("CANCEL_REQUEST", "cancel")}
        {user.relationship.status === "incoming" && <>{button("ACCEPT_REQUEST", "accept")}{button("DECLINE", "decline", true)}</>}
        {user.relationship.status === "friends" && button("REMOVE_FRIEND", "remove", true)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginBottom: 24, gap: 10 },
  label: { color: Colors.dark.textTechnical, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  button: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.dark.accent, backgroundColor: Colors.dark.backgroundElement },
  buttonText: { color: Colors.dark.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  dangerButton: { borderColor: Colors.dark.danger },
  dangerText: { color: Colors.dark.danger },
  dimmed: { opacity: 0.5 },
});
