import { UserRoleName } from "@/components/user-role-badge";
import { AppText as Text } from "@/components/app-text";
import type { ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import {
  getFriendsLeaderboard,
  type FriendsLeaderboardUser,
} from "@/api/leaderboards";
import { Colors, Fonts } from "@/constants/theme";
import { Screen } from "@/components/screen";

export function FriendsRankings({ header }: { header: ReactNode }) {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["leaderboards", "friends", userId],
    queryFn: ({ pageParam }) =>
      getFriendsLeaderboard({ page: pageParam, limit: 25 }),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
    enabled: Boolean(userId),
  });
  const first = query.data?.pages[0];
  const users = query.data?.pages.flatMap((page) => page.leaderboard) ?? [];

  function row(user: FriendsLeaderboardUser, current = false) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${user.username}'s profile`}
        onPress={() =>
          router.push({
            pathname: "/users/[userId]",
            params: { userId: user.userId },
          })
        }
        style={({ pressed }) => [
          styles.row,
          current && styles.current,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.rank}>#{user.rank}</Text>
        <View style={styles.identity}>
          <UserRoleName
            username={`${user.username}${user.userId === userId ? " // YOU" : ""}`}
            role={user.role}
            style={styles.username}
          />
          <Text style={styles.meta}>
            LVL {user.level}
            {user.echelon !== null ? ` // ECHELON ${user.echelon}` : ""}
          </Text>
          <Text style={styles.meta}>
            {user.faction?.name.toUpperCase() ?? "UNASSIGNED"}
          </Text>
        </View>
        <View>
          <Text style={styles.xp}>
            {user.lifetimeXP.toLocaleString("en-US")}
          </Text>
          <Text style={styles.meta}>LIFETIME XP</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Screen>
      <FlatList
        data={users}
        keyExtractor={(user) => user.userId}
        renderItem={({ item }) => row(item)}
        contentContainerStyle={styles.content}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => {
          void query.refetch();
        }}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetching)
            void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            {header}
            <Text style={styles.label}>CURRENT_POSITION</Text>
            {first?.currentUser ? row(first.currentUser, true) : null}
            <Text style={styles.label}>
              FRIENDS STANDINGS // {first?.pagination.totalUsers ?? 0} USERS
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.state}>
            {query.isPending ? (
              <ActivityIndicator color={Colors.dark.accent} />
            ) : (
              !query.isError && (
                <Text style={styles.meta}>No rankings available.</Text>
              )
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.state}>
            {query.isError ? (
              <>
                <Text style={styles.meta}>
                  Friends rankings could not be loaded.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (query.isFetchNextPageError) void query.fetchNextPage();
                    else void query.refetch();
                  }}
                  style={styles.retry}
                >
                  <Text style={styles.xp}>RETRY</Text>
                </Pressable>
              </>
            ) : query.isFetchingNextPage ? (
              <ActivityIndicator color={Colors.dark.accent} />
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 30 },
  label: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginVertical: 14,
  },
  row: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    marginBottom: 10,
  },
  current: { borderColor: Colors.dark.accent },
  pressed: { opacity: 0.5 },
  rank: {
    fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 20, fontWeight: "900" },
  identity: { flex: 1, gap: 5 },
  username: { color: Colors.dark.text, fontSize: 14, fontWeight: "900" },
  meta: { color: Colors.dark.textMuted, fontSize: 9 },
  xp: { color: Colors.dark.accent, fontSize: 12, fontWeight: "900" },
  state: { alignItems: "center", paddingVertical: 24, gap: 12 },
  retry: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },
});
