import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from "react-native";

import { searchUsers, type UserSearchResult } from "@/api/users";
import { Screen } from "@/components/screen";
import { factionEmblems } from "@/constants/faction-assets";
import { Colors, Fonts } from "@/constants/theme";

const colors = Colors.dark;

const PAGE_SIZE = 25;

export default function CommunityScreen() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchText]);

  const searchQuery = debouncedSearchText;

  const usersQuery = useInfiniteQuery({
    queryKey: ["users", "search", searchQuery],

    queryFn: ({ pageParam }) =>
      searchUsers({
        query: searchQuery,
        page: pageParam,
        limit: PAGE_SIZE,
      }),

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;

      if (page >= totalPages) {
        return undefined;
      }

      return page + 1;
    },

    enabled: searchQuery.length > 0,
  });

  const users = usersQuery.data?.pages.flatMap((page) => page.users) ?? [];

  const totalUsers = usersQuery.data?.pages[0]?.pagination.totalUsers ?? 0;

  function handleLoadMore() {
    if (usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) {
      usersQuery.fetchNextPage();
    }
  }

  function openUserProfile(userId: string) {
    router.push({
      pathname: "/users/[userId]",
      params: { userId },
    });
  }

  return (
    <Screen keyboardAvoiding>
      <FlatList
        style={styles.list}
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserSearchRow user={item} onPress={() => openUserProfile(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text style={styles.headerEyebrow}>ASCENDRA // COMMUNITY</Text>
            </View>

              <Text style={styles.headerTitle}>USER NETWORK</Text>

              <Text style={styles.headerDescription}>
                Search the Ascendra network and view athlete profiles.
              </Text>
            </View>

            <View style={styles.searchSection}>
              <Pressable accessibilityRole="button" onPress={() => router.push("../friends")} style={{ minHeight: 44, justifyContent: "center", marginBottom: 16, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14 }}>
                <Text style={{ color: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>FRIENDS // REQUESTS →</Text>
              </Pressable>
              <Text style={styles.searchLabel}>USER_SEARCH</Text>

              <View style={styles.searchInputContainer}>
                <Text style={styles.searchPrefix}>//</Text>

                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="SEARCH USERNAME"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.searchInput}
                />

                {searchText.length > 0 ? (
                  <Pressable
                    onPress={() => setSearchText("")}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed ? styles.clearButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.clearButtonText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {searchQuery.length > 0 ? (
              <View style={styles.resultsHeader}>
                <View>
                  <Text style={styles.resultsEyebrow}>NETWORK_RESULTS</Text>

                  <Text style={styles.resultsTitle}>USER DIRECTORY</Text>
                </View>

                {!usersQuery.isPending && !usersQuery.isError ? (
                  <Text style={styles.resultsCount}>
                    {totalUsers} {totalUsers === 1 ? "USER" : "USERS"}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {searchQuery.length === 0 ? (
              <View style={styles.initialState}>
                <View style={styles.initialMarker}>
                  <Text style={styles.initialMarkerText}>//</Text>
                </View>

                <Text style={styles.initialTitle}>SEARCH THE NETWORK</Text>

                <Text style={styles.initialDescription}>
                  Enter a username to locate another Ascendra member.
                </Text>
              </View>
            ) : null}

            {searchQuery.length > 0 && usersQuery.isPending ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={colors.accent} />

                <Text style={styles.loadingText}>SEARCHING_NETWORK</Text>
              </View>
            ) : null}

            {searchQuery.length > 0 && usersQuery.isError ? (
              <View style={styles.errorState}>
                <Text style={styles.errorTitle}>SEARCH_UNAVAILABLE</Text>

                <Text style={styles.errorDescription}>
                  The user network could not be searched.
                </Text>

                <Pressable
                  onPress={() => usersQuery.refetch()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed ? styles.retryButtonPressed : null,
                  ]}
                >
                  <Text style={styles.retryButtonText}>RETRY</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          searchQuery.length > 0 &&
          !usersQuery.isPending &&
          !usersQuery.isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>NO_USERS_FOUND</Text>

              <Text style={styles.emptyDescription}>
                No active users matched "{searchQuery}".
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          usersQuery.isFetchingNextPage ? (
            <View style={styles.paginationLoader}>
              <ActivityIndicator size="small" color={colors.accent} />

              <Text style={styles.paginationLoaderText}>
                LOADING_MORE_USERS
              </Text>
            </View>
          ) : users.length > 0 && !usersQuery.hasNextPage ? (
            <View style={styles.endMarker}>
              <View style={styles.endMarkerLine} />

              <Text style={styles.endMarkerText}>END_OF_RESULTS</Text>

              <View style={styles.endMarkerLine} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function UserSearchRow({
  user,
  onPress,
}: {
  user: UserSearchResult;
  onPress: () => void;
}) {
  const factionColor = user.faction?.colors.primary ?? colors.textDim;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.userRow,
        pressed ? styles.userRowPressed : null,
      ]}
    >
      <View
        style={[
          styles.userAccent,
          {
            backgroundColor: factionColor,
          },
        ]}
      />

      <View style={styles.identitySection}>
        <View style={styles.usernameRow}>
          <Text style={styles.username} numberOfLines={1}>
            {user.username}
          </Text>

          {user.faction ? (
            <Image
              source={factionEmblems[user.faction.slug]}
              style={styles.factionEmblem}
              resizeMode="contain"
            />
          ) : null}
        </View>

        <Text
          style={[
            styles.factionName,
            {
              color: factionColor,
            },
          ]}
        >
          {user.faction ? user.faction.name.toUpperCase() : "UNASSIGNED"}
        </Text>
      </View>

      <View style={styles.progressionSection}>
        <Text style={styles.levelValue}>LVL {user.progression.level}</Text>

        <Text style={styles.echelonValue}>
          {user.progression.echelon !== null
            ? `ECHELON ${user.progression.echelon}`
            : "NO ECHELON"}
        </Text>
      </View>

      <Text style={styles.rowArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },

  listContent: {
    paddingTop: 20,
    paddingBottom: 120,
  },

  header: {
    marginBottom: 26,
  },

  headerEyebrow: {
    color: colors.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
  },

  headerTitle: {
    fontFamily: Fonts.display,
    color: colors.text,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 5,
  },

  headerDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  searchSection: {
    marginBottom: 28,
  },

  searchLabel: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 7,
  },

  searchInputContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: 13,
  },

  searchPrefix: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingVertical: 0,
  },

  clearButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },

  clearButtonPressed: {
    opacity: 0.5,
  },

  clearButtonText: {
    fontFamily: Fonts.display,
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: "400",
    lineHeight: 24,
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 4,
  },

  resultsEyebrow: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  resultsTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  resultsCount: {
    color: colors.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  initialState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 65,
    paddingHorizontal: 24,
  },

  initialMarker: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    marginBottom: 15,
  },

  initialMarkerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },

  initialTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  initialDescription: {
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 6,
  },

  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 10,
  },

  loadingText: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  errorState: {
    alignItems: "center",
    paddingVertical: 45,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  errorDescription: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 6,
  },

  retryButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 14,
  },

  retryButtonPressed: {
    backgroundColor: colors.backgroundSelected,
  },

  retryButtonText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  userRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    position: "relative",
  },

  userRowPressed: {
    opacity: 0.68,
  },

  userAccent: {
    width: 2,
    height: 38,
    marginRight: 12,
  },

  identitySection: {
    flex: 1,
    minWidth: 0,
  },

  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  username: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },

  factionEmblem: {
    width: 18,
    height: 18,
  },

  factionName: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 4,
  },

  progressionSection: {
    alignItems: "flex-end",
    marginLeft: 12,
  },

  levelValue: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
  },

  echelonValue: {
    color: colors.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 4,
  },

  rowArrow: {
    fontFamily: Fonts.display,
    color: colors.textDim,
    fontSize: 20,
    marginLeft: 10,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  emptyDescription: {
    color: colors.textDim,
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
  },

  paginationLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },

  paginationLoaderText: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  endMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },

  endMarkerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },

  endMarkerText: {
    color: colors.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
