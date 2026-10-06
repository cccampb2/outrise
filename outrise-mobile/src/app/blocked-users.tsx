import { ActivityIndicator, FlatList, Image, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { getBlockedUsers } from "@/api/blocks";
import { BlockUserControls } from "@/components/block-user-controls";
import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import {
  MessageButton,
  messagingError,
  messageStyles as styles,
} from "@/components/messaging-ui";
import { Colors } from "@/constants/theme";
import type { RootState } from "@/store/store";

export default function BlockedUsersScreen() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["blocked-users", userId],
    queryFn: ({ pageParam }) => getBlockedUsers(pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.hasMore ? page.pagination.page + 1 : undefined,
    enabled: !!userId,
  });
  const users = query.data?.pages.flatMap((page) => page.users) ?? [];
  return (
    <Screen>
      <View style={styles.header}>
        <MessageButton
          label="← BACK"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/profile")
          }
        />
        <BrandHeader label="BLOCKED_USERS" />
        <Text style={styles.title}>Blocked users</Text>
        <Text style={styles.subtitle}>
          Manage the accounts you have blocked. Unblocking does not restore
          friendships.
        </Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id ?? item.blockedAt}
        contentContainerStyle={styles.inboxContent}
        refreshing={query.isRefetching}
        onRefresh={() => {
          void query.refetch();
        }}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16 }}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                {item.profileImage?.url ? (
                  <Image
                    source={{ uri: item.profileImage.url }}
                    style={styles.avatar}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.username.slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.meta}>
                  Blocked {new Date(item.blockedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {item.id && (
              <BlockUserControls userId={item.id} username={item.username} />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.state}>
            {query.isPending ? (
              <ActivityIndicator color={Colors.dark.accent} />
            ) : (
              <Text style={styles.subtitle}>
                {query.isError
                  ? messagingError(query.error)
                  : "You haven’t blocked anyone."}
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.state}>
            {query.isError && (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  {messagingError(query.error)}
                </Text>
                <MessageButton
                  label="RETRY"
                  onPress={() => {
                    void query.refetch();
                  }}
                />
              </>
            )}
            {query.hasNextPage && (
              <MessageButton
                label={query.isFetchingNextPage ? "LOADING…" : "LOAD MORE"}
                disabled={query.isFetchingNextPage}
                onPress={() => {
                  void query.fetchNextPage();
                }}
              />
            )}
          </View>
        }
      />
    </Screen>
  );
}
