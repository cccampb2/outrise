import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { ApiError } from "@/api/client";
import { acceptFriendRequest, cancelFriendRequest, declineFriendRequest, getFriendList, removeFriend, type FriendListItem, type FriendRequestItem, type FriendListSection } from "@/api/friends";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { factionEmblems } from "@/constants/faction-assets";

type Item = FriendListItem | FriendRequestItem;
type Action = { kind: "accept" | "decline" | "cancel" | "remove"; item: Item };
const sections: FriendListSection[] = ["friends", "incoming", "outgoing"];
const emptyMessages = { friends: "No friends yet. Find people through Community search.", incoming: "No incoming friend requests.", outgoing: "No outgoing friend requests." };

export default function FriendsScreen() {
  const [section, setSection] = useState<FriendListSection>("friends");
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const queryClient = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: ["friends", currentUserId, section],
    queryFn: ({ pageParam }) => getFriendList(section, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
    enabled: Boolean(currentUserId),
  });
  const action = useMutation({
    mutationFn: async ({ kind, item }: Action) => {
      if (kind === "remove") return removeFriend(item.user.id);
      if (!("requestId" in item)) throw new Error("Request unavailable. Refresh and try again.");
      if (kind === "accept") return acceptFriendRequest(item.requestId);
      if (kind === "decline") return declineFriendRequest(item.requestId);
      return cancelFriendRequest(item.requestId);
    },
    onError: (error) => Alert.alert("Friends", error instanceof ApiError ? error.getDisplayMessage() : error.message),
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards", "friends"] }),
        queryClient.invalidateQueries({ queryKey: ["public-user", variables.item.user.id] }),
      ]);
    },
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const pagination = list.data?.pages[0]?.pagination;
  const total = pagination?.totalUsers ?? pagination?.totalRequests ?? 0;

  function act(kind: Action["kind"], item: Item) {
    if (kind === "remove") {
      Alert.alert("Remove friend", `Remove ${item.user.username} from your friends?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => action.mutate({ kind, item }) },
      ]);
    } else action.mutate({ kind, item });
  }

  function actionButton(label: string, kind: Action["kind"], item: Item) {
    return <Pressable accessibilityRole="button" disabled={action.isPending} onPress={() => act(kind, item)} style={({ pressed }) => [styles.button, (pressed || action.isPending) && styles.dimmed]}><Text style={[styles.buttonText, kind !== "accept" && styles.secondaryText]}>{label}</Text></Pressable>;
  }

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← BACK</Text></Pressable>
      <Text style={styles.eyebrow}>{"ASCENDRA // COMMUNITY"}</Text>
      <Text style={styles.title}>FRIENDS</Text>
      <View style={styles.tabs}>
        {sections.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: section === value }} onPress={() => setSection(value)} style={[styles.tab, section === value && styles.selectedTab]}><Text style={[styles.tabText, section === value && styles.selectedText]}>{value.toUpperCase()}</Text></Pressable>)}
      </View>
      <Text style={styles.count}>{`${section.toUpperCase()} // ${total}`}</Text>
      <FlatList
        key={section}
        data={items}
        keyExtractor={(item) => "requestId" in item ? item.requestId : item.user.id}
        contentContainerStyle={styles.list}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetching) void list.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.user.username}'s profile`} onPress={() => router.push({ pathname: "/users/[userId]", params: { userId: item.user.id } })} style={styles.identity}>
              <View style={styles.avatar}>
                {item.user.profileImage?.url ? <Image source={{ uri: item.user.profileImage.url }} style={styles.photo} /> : item.user.faction ? <Image source={factionEmblems[item.user.faction.slug]} style={styles.emblem} resizeMode="contain" /> : <Text style={styles.meta}>{"//"}</Text>}
              </View>
              <View style={styles.userText}>
                <Text style={styles.username} numberOfLines={1}>{item.user.username}</Text>
                <Text style={[styles.meta, { color: item.user.faction?.colors.primary ?? Colors.dark.textMuted }]}>{item.user.faction?.name.toUpperCase() ?? "UNASSIGNED"}</Text>
                <Text style={styles.meta}>LEVEL {item.user.progression.level}{item.user.progression.echelon !== null ? ` // ECHELON ${item.user.progression.echelon}` : ""}</Text>
              </View>
            </Pressable>
            <View style={styles.actions}>
              {section === "friends" && actionButton("REMOVE FRIEND", "remove", item)}
              {section === "incoming" && <>{actionButton("ACCEPT", "accept", item)}{actionButton("DECLINE", "decline", item)}</>}
              {section === "outgoing" && actionButton("CANCEL REQUEST", "cancel", item)}
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.state}>{list.isPending ? <ActivityIndicator color={Colors.dark.accent} /> : !list.isError && <Text style={styles.message}>{emptyMessages[section]}</Text>}</View>}
        ListFooterComponent={<View style={styles.state}>{list.isError ? <><Text style={styles.message}>{list.error instanceof ApiError ? list.error.getDisplayMessage() : list.error.message}</Text><Pressable accessibilityRole="button" onPress={() => { if (list.isFetchNextPageError) void list.fetchNextPage(); else void list.refetch(); }} style={styles.button}><Text style={styles.buttonText}>RETRY</Text></Pressable></> : list.isFetchingNextPage ? <ActivityIndicator color={Colors.dark.accent} /> : null}</View>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", paddingVertical: 12 },
  backText: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  eyebrow: { color: Colors.dark.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.4, marginTop: 12 },
  title: { color: Colors.dark.text, fontSize: 28, fontWeight: "900", marginVertical: 8 },
  tabs: { flexDirection: "row", gap: 6, marginVertical: 16 },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.dark.border },
  selectedTab: { borderColor: Colors.dark.accent, backgroundColor: Colors.dark.backgroundSelected },
  tabText: { color: Colors.dark.textMuted, fontSize: 9, fontWeight: "900" },
  selectedText: { color: Colors.dark.accent },
  count: { color: Colors.dark.textTechnical, fontSize: 9, letterSpacing: 1, marginBottom: 12 },
  list: { flexGrow: 1, paddingBottom: 24 },
  card: { borderWidth: 1, borderColor: Colors.dark.border, backgroundColor: Colors.dark.backgroundElement, padding: 14, marginBottom: 12 },
  identity: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 60 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark.backgroundDeep },
  photo: { width: "100%", height: "100%" },
  emblem: { width: 38, height: 38 },
  userText: { flex: 1, gap: 4 },
  username: { color: Colors.dark.text, fontSize: 16, fontWeight: "900" },
  meta: { color: Colors.dark.textMuted, fontSize: 9, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  button: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: Colors.dark.borderStrong },
  buttonText: { color: Colors.dark.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  secondaryText: { color: Colors.dark.textSecondary },
  dimmed: { opacity: 0.5 },
  state: { paddingVertical: 24, alignItems: "center", gap: 12 },
  message: { color: Colors.dark.textSecondary, fontSize: 12, textAlign: "center", lineHeight: 18 },
});
