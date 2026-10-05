import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { useMessageCount } from "@/hooks/use-message-count";
import Animated from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTabBarScroll } from "@/hooks/use-tab-bar-scroll";
import { BrandHeader } from "@/components/brand-header";
import { UserRoleBadge } from "@/components/user-role-badge";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { searchUsers, type UserSearchResult } from "@/api/users";
import { Screen } from "@/components/screen";
import { factionEmblems } from "@/constants/faction-assets";
import { Colors, Fonts } from "@/constants/theme";
const colors = Colors.dark;
const PAGE_SIZE = 25;

export default function CommunityScreen() {
  const scrollHandler = useTabBarScroll();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const messageCount = useMessageCount(userId);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const compactSearch = searchFocused || searchText.trim().length > 0;
  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearchText(searchText.trim()),
      350,
    );
    return () => clearTimeout(timeout);
  }, [searchText]);
  const searchQuery = debouncedSearchText;
  const usersQuery = useInfiniteQuery({
    queryKey: ["users", "search", searchQuery],
    queryFn: ({ pageParam }) =>
      searchUsers({ query: searchQuery, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: searchQuery.length > 0,
  });
  const users = usersQuery.data?.pages.flatMap((page) => page.users) ?? [];
  const totalUsers = usersQuery.data?.pages[0]?.pagination.totalUsers ?? 0;
  const handleLoadMore = () => {
    if (usersQuery.hasNextPage && !usersQuery.isFetching && !usersQuery.isError)
      void usersQuery.fetchNextPage();
  };
  const retry = () => {
    if (usersQuery.isFetchNextPageError) void usersQuery.fetchNextPage();
    else void usersQuery.refetch();
  };
  return (
    <Screen keyboardAvoiding>
      <Animated.FlatList
        style={styles.list}
        data={users}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <UserSearchRow
            user={item}
            onPress={() =>
              router.push({
                pathname: "/users/[userId]",
                params: { userId: item.id },
              })
            }
          />
        )}
        ListHeaderComponent={
          <>
            <View
              style={[styles.header, compactSearch && { marginBottom: 14 }]}
            >
              <BrandHeader label="COMMUNITY" />
              <View
                style={[
                  styles.heroTitleRow,
                  compactSearch && { display: "none" },
                ]}
              >
                <View style={styles.heroRule} />
                <Text style={styles.headerTitle}>
                  YOUR PEOPLE.{"\n"}YOUR NEXT LEVEL.
                </Text>
              </View>
              <Text
                style={[
                  styles.headerDescription,
                  compactSearch && { display: "none" },
                ]}
              >
                Find your training circle. Stay connected. Rise together.
              </Text>
            </View>
            <View
              style={[styles.shortcuts, compactSearch && { display: "none" }]}
            >
              <CommunityShortcut
                icon="people-outline"
                eyebrow="YOUR CIRCLE"
                title="Friends"
                description="Athletes & requests"
                onPress={() => router.push("/friends")}
              />
              <CommunityShortcut
                icon="chatbubble-ellipses-outline"
                eyebrow="KEEP IN TOUCH"
                title="Messages"
                description="Open your inbox"
                count={messageCount.data?.unreadCount}
                onPress={() => router.push("/messages")}
              />
            </View>
            <View
              style={[
                styles.searchSection,
                compactSearch && { marginBottom: 14 },
              ]}
            >
              <View style={[styles.sectionHeading, compactSearch && { marginBottom: 12 }]}>
                <Text style={styles.sectionTitle}>DISCOVER ATHLETES</Text>
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color={colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.sectionDescription,
                  compactSearch && { display: "none" },
                ]}
              >
                A teammate, a rival, or your next training partner.
              </Text>
              <View
                style={[
                  styles.searchContainer,
                  searchFocused && styles.searchFocused,
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  accessibilityLabel="Search athletes by username"
                  value={searchText}
                  onChangeText={setSearchText}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search by username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {searchText.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => setSearchText("")}
                    style={({ pressed }) => [
                      styles.clearButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>
            {searchQuery.length === 0 ? (
              <View style={styles.discoveryCard}>
                <View style={styles.discoveryIcon}>
                  <Ionicons
                    name="fitness-outline"
                    size={26}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.discoveryText}>
                  <Text style={styles.discoveryTitle}>
                    Good competition starts here.
                  </Text>
                  <Text style={styles.discoveryDescription}>
                    Search for an athlete, explore their progress, and connect
                    through their profile.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>ATHLETE DIRECTORY</Text>
                {!usersQuery.isPending && !usersQuery.isError && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {totalUsers} {totalUsers === 1 ? "match" : "matches"}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          searchQuery.length > 0 ? (
            <View style={styles.state}>
              {usersQuery.isPending ? (
                <>
                  <ActivityIndicator color={colors.textSecondary} />
                  <Text style={styles.stateDescription}>Finding athletes…</Text>
                </>
              ) : (
                !usersQuery.isError && (
                  <>
                    <Ionicons
                      name="search-outline"
                      size={30}
                      color={colors.textMuted}
                    />
                    <Text style={styles.stateTitle}>No matches yet</Text>
                    <Text style={styles.stateDescription}>
                      No active athletes matched &quot;{searchQuery}&quot;. Try
                      another username.
                    </Text>
                  </>
                )
              )}
            </View>
          ) : null
        }
        ListFooterComponent={
          searchQuery.length > 0 ? (
            <View style={styles.footer}>
              {usersQuery.isError ? (
                <View style={styles.errorCard}>
                  <Text accessibilityRole="alert" style={styles.errorTitle}>
                    {usersQuery.isFetchNextPageError
                      ? "Couldn’t load more athletes"
                      : "Search is unavailable"}
                  </Text>
                  <Text style={styles.stateDescription}>
                    Check your connection and try again.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={retry}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.retryText}>TRY AGAIN</Text>
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={colors.text}
                    />
                  </Pressable>
                </View>
              ) : usersQuery.isFetchingNextPage ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : users.length > 0 && !usersQuery.hasNextPage ? (
                <View style={styles.endMarker}>
                  <View style={styles.endLine} />
                  <Text style={styles.endText}>YOU’RE ALL CAUGHT UP</Text>
                  <View style={styles.endLine} />
                </View>
              ) : null}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function CommunityShortcut({
  count,
  icon,
  eyebrow,
  title,
  description,
  onPress,
}: {
  icon: "people-outline" | "chatbubble-ellipses-outline";
  eyebrow: string;
  title: string;
  description: string;
  onPress: () => void;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        pressed && styles.shortcutPressed,
      ]}
    >
      <View style={styles.shortcutTop}>
        <View style={styles.shortcutIcon}>
          <Ionicons name={icon} size={23} color={colors.text} />
        </View>
        <Ionicons
          name="arrow-forward-outline"
          size={17}
          color={colors.textMuted}
        />
      </View>
      {Boolean(count && count > 0) && (
        <Text
          style={{
            color: colors.text,
            fontSize: 11,
            fontWeight: "800",
            marginBottom: 5,
          }}
        >
          {count! > 99 ? "99+" : count} UNREAD
        </Text>
      )}
      <Text style={styles.shortcutEyebrow}>{eyebrow}</Text>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutDescription}>{description}</Text>
    </Pressable>
  );
}

function UserSearchRow({
  user,
  onPress,
}: {
  user: UserSearchResult;
  onPress: () => void;
}) {
  const factionColor = user.faction?.colors.primary ?? colors.borderStrong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${user.username}'s profile`}
      onPress={onPress}
      style={({ pressed }) => [styles.userRow, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, { borderColor: factionColor }]}>
        {user.faction ? (
          <Image
            source={factionEmblems[user.faction.slug]}
            resizeMode="contain"
            style={styles.emblem}
          />
        ) : (
          <Text style={styles.initial}>
            {user.username.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.identity}>
        <View style={styles.usernameRow}>
          <Text style={styles.username} numberOfLines={1}>
            {user.username}
          </Text>
          <UserRoleBadge role={user.role} />
        </View>
        <View style={styles.factionRow}>
          {user.faction && (
            <View
              style={[styles.factionDot, { backgroundColor: factionColor }]}
            />
          )}
          <Text style={styles.factionName} numberOfLines={1}>
            {user.faction?.name ?? "Unassigned"}
          </Text>
        </View>
        <View style={styles.progressionRow}>
          <Text style={styles.level}>LEVEL {user.progression.level}</Text>
          {user.progression.echelon !== null && (
            <Text style={styles.echelon}>E{user.progression.echelon}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingTop: 18, paddingBottom: 120 },
  header: { marginBottom: 26 },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    marginTop: 22,
  },
  heroRule: { width: 3, backgroundColor: colors.accent, marginVertical: 6 },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },
  headerDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 13,
    maxWidth: 310,
  },
  shortcuts: { flexDirection: "row", gap: 12, marginBottom: 30 },
  shortcut: {
    flex: 1,
    minWidth: 0,
    minHeight: 160,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
  },
  shortcutPressed: { backgroundColor: colors.backgroundSelected, opacity: 0.8 },
  shortcutTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    backgroundColor: colors.backgroundSelected,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutEyebrow: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.9,
  },
  shortcutTitle: {
    fontFamily: Fonts.display,
    fontSize: 25,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  shortcutDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 3,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.7,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 7,
    marginBottom: 16,
  },
  searchSection: { marginBottom: 22 },
  searchContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
  },
  searchFocused: { borderColor: colors.textSecondary },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 15,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.65 },
  discoveryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElement,
  },
  discoveryIcon: { paddingTop: 2 },
  discoveryText: { flex: 1 },
  discoveryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  discoveryDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  resultsTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.backgroundSelected,
  },
  countText: { fontSize: 11, color: colors.textSecondary },
  userRow: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElement,
  },
  avatar: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSelected,
  },
  emblem: { width: 31, height: 31 },
  initial: { color: colors.text, fontSize: 21, fontWeight: "700" },
  identity: { flex: 1, minWidth: 0 },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  username: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  factionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  factionDot: { width: 5, height: 5, borderRadius: 3 },
  factionName: { flexShrink: 1, fontSize: 11, color: colors.textSecondary },
  progressionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  level: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.7,
  },
  echelon: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.echelon,
    borderWidth: 1,
    borderColor: colors.echelonBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  state: { alignItems: "center", paddingVertical: 32, gap: 12 },
  stateTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  stateDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
  },
  footer: { paddingVertical: 16 },
  errorCard: {
    alignItems: "center",
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  errorTitle: { fontSize: 14, fontWeight: "700", color: colors.danger },
  retryButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: 4,
  },
  retryText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  endMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  endLine: { flex: 1, height: 1, backgroundColor: colors.border },
  endText: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
