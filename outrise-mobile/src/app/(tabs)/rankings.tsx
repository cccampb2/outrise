import Animated from "react-native-reanimated";
import { useTabBarScroll } from "@/hooks/use-tab-bar-scroll";
import { BrandHeader } from "@/components/brand-header";
import { UserRoleName } from "@/components/user-role-badge";
import { AppText as Text } from "@/components/app-text";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { router } from "expo-router";
import {
  getFactionStandings,
  getGlobalLeaderboard,
  type FactionStanding,
  type GlobalLeaderboardUser,
} from "@/api/leaderboards";
import { getFactions, type Faction } from "@/api/factions";
import { Screen } from "@/components/screen";
import { FriendsRankings } from "@/components/friends-rankings";
import { ZenithEmblem } from "@/components/zenith-emblem";
import { factionEmblems } from "@/constants/faction-assets";
import { Colors, Fonts } from "@/constants/theme";

const colors = Colors.dark;

const PAGE_SIZE = 25;

type RankingsTab = "global" | "factions" | "friends";

export default function RankingsScreen() {
  const scrollHandler = useTabBarScroll();
  const [selectedTab, setSelectedTab] = useState<RankingsTab>("global");

  const factionsQuery = useQuery({
    queryKey: ["factions"],
    queryFn: getFactions,
  });

  const globalLeaderboardQuery = useInfiniteQuery({
    queryKey: ["leaderboards", "global"],

    queryFn: ({ pageParam }) =>
      getGlobalLeaderboard({
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
  });

  const factionStandingsQuery = useQuery({
    queryKey: ["leaderboards", "factions"],
    queryFn: getFactionStandings,
    enabled: selectedTab === "factions",
  });

  const leaderboard =
    globalLeaderboardQuery.data?.pages.flatMap((page) => page.leaderboard) ??
    [];

  const firstPage = globalLeaderboardQuery.data?.pages[0];

  const currentUser = firstPage?.currentUser ?? null;

  const totalUsers = firstPage?.pagination.totalUsers ?? 0;

  const factions = factionsQuery.data?.factions ?? [];

  function handleLoadMore() {
    if (
      globalLeaderboardQuery.hasNextPage &&
      !globalLeaderboardQuery.isFetchingNextPage
    ) {
      globalLeaderboardQuery.fetchNextPage();
    }
  }

  function openUserProfile(userId: string) {
    router.push({
      pathname: "/users/[userId]",
      params: {
        userId,
      },
    });
  }

  if (selectedTab === "friends") {
    return (
      <FriendsRankings
        header={
          <RankingsHeader
            selectedTab={selectedTab}
            onSelectTab={setSelectedTab}
          />
        }
      />
    );
  }

  if (selectedTab === "global") {
    if (globalLeaderboardQuery.isPending) {
      return (
        <Screen>
          <View style={styles.stateScreen}>
            <ActivityIndicator size="large" color={colors.accent} />

            <Text style={styles.stateTechnical}>LOADING_RANKINGS</Text>
          </View>
        </Screen>
      );
    }

    if (globalLeaderboardQuery.isError) {
      return (
        <Screen>
          <View style={styles.stateScreen}>
            <Text style={styles.errorTitle}>RANKINGS_UNAVAILABLE</Text>

            <Text style={styles.errorDescription}>
              Global rankings could not be loaded.
            </Text>

            <Pressable
              onPress={() => globalLeaderboardQuery.refetch()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.retryButtonPressed : null,
              ]}
            >
              <Text style={styles.retryButtonText}>RETRY</Text>
            </Pressable>
          </View>
        </Screen>
      );
    }

    return (
      <Screen>
        <Animated.FlatList
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={styles.list}
          data={leaderboard}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <LeaderboardRow
              user={item}
              factions={factions}
              onPress={() => openUserProfile(item.userId)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <>
              <RankingsHeader
                selectedTab={selectedTab}
                onSelectTab={setSelectedTab}
              />

              <View style={styles.currentPositionSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIndex}>01</Text>

                  <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionEyebrow}>CURRENT_POSITION</Text>

                    <Text style={styles.sectionTitle}>YOUR GLOBAL RANK</Text>
                  </View>
                </View>

                {currentUser ? (
                  <CurrentUserCard
                    user={currentUser}
                    factions={factions}
                    onPress={() => openUserProfile(currentUser.userId)}
                  />
                ) : (
                  <UnrankedUserCard />
                )}
              </View>

              <View style={styles.leaderboardHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>GLOBAL_NETWORK</Text>

                  <Text style={styles.leaderboardTitle}>LIFETIME XP</Text>
                </View>

                <Text style={styles.leaderboardCount}>{totalUsers} USERS</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>NO_RANKINGS_AVAILABLE</Text>

              <Text style={styles.emptyDescription}>
                Rankings will appear when users begin earning XP.
              </Text>
            </View>
          }
          ListFooterComponent={
            globalLeaderboardQuery.isFetchingNextPage ? (
              <View style={styles.paginationLoader}>
                <ActivityIndicator size="small" color={colors.accent} />

                <Text style={styles.paginationLoaderText}>
                  LOADING_MORE_RANKINGS
                </Text>
              </View>
            ) : leaderboard.length > 0 &&
              !globalLeaderboardQuery.hasNextPage ? (
              <View style={styles.endMarker}>
                <View style={styles.endMarkerLine} />

                <Text style={styles.endMarkerText}>END_OF_GLOBAL_RANKINGS</Text>

                <View style={styles.endMarkerLine} />
              </View>
            ) : null
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.FlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.list}
        data={factionStandingsQuery.data?.standings ?? []}
        keyExtractor={(item) => item.faction._id}
        renderItem={({ item }) => (
          <FactionStandingRow
            standing={item}
            onPress={() => {
              router.push({
                pathname: "/rankings/factions/[factionSlug]",
                params: {
                  factionSlug: item.faction.slug,
                },
              });
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <RankingsHeader
              selectedTab={selectedTab}
              onSelectTab={setSelectedTab}
            />

            {factionStandingsQuery.data?.season ? (
              <View style={styles.seasonPanel}>
                <View>
                  <Text style={styles.sectionEyebrow}>ACTIVE_SEASON</Text>

                  <Text style={styles.seasonTitle}>
                    SEASON {factionStandingsQuery.data.season.seasonNumber}
                  </Text>
                </View>

                <View style={styles.seasonMetadata}>
                  <Text style={styles.seasonQuarter}>
                    Q{factionStandingsQuery.data.season.quarter}
                  </Text>

                  <Text style={styles.seasonYear}>
                    {factionStandingsQuery.data.season.year}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.factionLeaderboardHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>FACTION_NETWORK</Text>

                <Text style={styles.leaderboardTitle}>SEASON STANDINGS</Text>
              </View>

              <Text style={styles.leaderboardCount}>
                {factionStandingsQuery.data?.standings.length ?? 0} FACTIONS
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          factionStandingsQuery.isPending ? (
            <View style={styles.factionState}>
              <ActivityIndicator size="large" color={colors.accent} />

              <Text style={styles.stateTechnical}>
                LOADING_FACTION_STANDINGS
              </Text>
            </View>
          ) : factionStandingsQuery.isError ? (
            <View style={styles.factionState}>
              <Text style={styles.errorTitle}>FACTIONS_UNAVAILABLE</Text>

              <Text style={styles.errorDescription}>
                Faction standings could not be loaded.
              </Text>

              <Pressable
                onPress={() => factionStandingsQuery.refetch()}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed ? styles.retryButtonPressed : null,
                ]}
              >
                <Text style={styles.retryButtonText}>RETRY</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>NO_ACTIVE_SEASON</Text>

              <Text style={styles.emptyDescription}>
                Faction standings will return when the next season begins.
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

function RankingsHeader({
  selectedTab,
  onSelectTab,
}: {
  selectedTab: RankingsTab;
  onSelectTab: (tab: RankingsTab) => void;
}) {
  const isGlobal = selectedTab === "global";

  const isFactions = selectedTab === "factions";
  const isFriends = selectedTab === "friends";

  return (
    <>
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <BrandHeader label="RANKINGS" style={styles.brandLabelLayout} />
        </View>

        <Text style={styles.title}>
          {isFriends
            ? "FRIENDS STANDINGS"
            : isFactions
              ? "FACTION STANDINGS"
              : "GLOBAL STANDINGS"}
        </Text>

        <Text style={styles.description}>
          {isFriends
            ? "Compare lifetime XP with your accepted friends. You are included in these standings."
            : isFactions
              ? "Season XP determines faction position. Every contribution pushes your faction higher."
              : "Lifetime XP determines your global position. The top 25 hold Zenith status."}
        </Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => onSelectTab("global")}
          style={[styles.tab, isGlobal ? styles.activeTab : null]}
        >
          <Text
            style={isGlobal ? styles.activeTabText : styles.inactiveTabText}
          >
            GLOBAL
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectTab("factions")}
          style={[styles.tab, isFactions ? styles.activeTab : null]}
        >
          <Text
            style={isFactions ? styles.activeTabText : styles.inactiveTabText}
          >
            FACTIONS
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onSelectTab("friends")}
          style={[styles.tab, isFriends ? styles.activeTab : null]}
        >
          <Text
            style={isFriends ? styles.activeTabText : styles.inactiveTabText}
          >
            FRIENDS
          </Text>
        </Pressable>
      </View>
    </>
  );
}

function CurrentUserCard({
  user,
  factions,
  onPress,
}: {
  user: GlobalLeaderboardUser;
  factions: Faction[];
  onPress: () => void;
}) {
  const factionColor = getFactionColor(user, factions);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.currentUserCard,
        pressed ? styles.userRowPressed : null,
      ]}
    >
      <View style={styles.currentRankBlock}>
        <Text style={styles.currentRankLabel}>
          {user.zenithRank !== null ? "ZENITH" : "GLOBAL"}
        </Text>

        <Text
          style={[
            styles.currentRank,
            user.zenithRank !== null ? styles.currentZenithRank : null,
          ]}
        >
          #{formatRank(user.rank)}
        </Text>
      </View>

      <View style={styles.currentIdentity}>
        {user.zenithRank !== null ? (
          <View style={styles.currentZenithEmblem}>
            <ZenithEmblem rank={user.zenithRank} size={76} />
          </View>
        ) : (
          <View style={styles.globalRankMarker}>
            <Text style={styles.globalRankMarkerText}>
              {formatRank(user.rank)}
            </Text>
          </View>
        )}

        <View style={styles.currentUserInfo}>
          <UserRoleName
            username={user.username}
            role={user.role}
            style={styles.currentUsername}
          />

          <View style={styles.currentMetadataRow}>
            <Text style={styles.currentLevel}>LEVEL {user.level}</Text>

            {user.faction ? (
              <>
                <Text style={styles.metadataDivider}>//</Text>

                <Text
                  style={[
                    styles.currentFaction,
                    factionColor
                      ? {
                          color: factionColor,
                        }
                      : null,
                  ]}
                >
                  {user.faction.name.toUpperCase()}
                </Text>
              </>
            ) : null}
          </View>

          <Text style={styles.currentXP}>{formatXP(user.lifetimeXP)} XP</Text>
        </View>
      </View>
    </Pressable>
  );
}

function UnrankedUserCard() {
  return (
    <View style={styles.currentUserCard}>
      <View style={styles.currentRankBlock}>
        <Text style={styles.currentRankLabel}>GLOBAL</Text>

        <Text style={styles.unrankedRank}>#---</Text>
      </View>

      <View style={styles.unrankedContent}>
        <View style={styles.unrankedMarker}>
          <Text style={styles.unrankedMarkerText}>---</Text>
        </View>

        <View style={styles.unrankedInfo}>
          <Text style={styles.unrankedTitle}>NOT RANKED YET</Text>

          <Text style={styles.unrankedDescription}>
            Earn XP by completing workouts to enter the global standings.
          </Text>
        </View>
      </View>
    </View>
  );
}

function LeaderboardRow({
  user,
  factions,
  onPress,
}: {
  user: GlobalLeaderboardUser;
  factions: Faction[];
  onPress: () => void;
}) {
  const factionColor = getFactionColor(user, factions);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        user.zenithRank !== null ? styles.zenithRow : null,
        pressed ? styles.userRowPressed : null,
      ]}
    >
      <View style={styles.rankColumn}>
        <Text
          style={[
            styles.rankNumber,
            user.zenithRank !== null ? styles.zenithRankNumber : null,
          ]}
        >
          {formatRank(user.rank)}
        </Text>

        <Text style={styles.rankLabel}>
          {user.zenithRank !== null ? "ZENITH" : "GLOBAL"}
        </Text>
      </View>

      <View style={styles.rowStatus}>
        {user.zenithRank !== null ? (
          <ZenithEmblem rank={user.zenithRank} size={58} />
        ) : (
          <View style={styles.standardRankMarker}>
            <Text style={styles.standardRankMarkerText}>
              {formatRank(user.rank)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rowIdentity}>
        <UserRoleName
          username={user.username}
          role={user.role}
          style={styles.username}
        />

        <View style={styles.metadataRow}>
          <Text style={styles.metadataLevel}>LVL {user.level}</Text>

          {user.faction ? (
            <>
              <Text style={styles.metadataDivider}>//</Text>

              <Text
                style={[
                  styles.factionName,
                  factionColor
                    ? {
                        color: factionColor,
                      }
                    : null,
                ]}
              >
                {user.faction.name.toUpperCase()}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.xpColumn}>
        <Text style={styles.xp}>{formatXP(user.lifetimeXP)}</Text>

        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </Pressable>
  );
}

function FactionStandingRow({
  standing,
  onPress,
}: {
  standing: FactionStanding;
  onPress: () => void;
}) {
  const faction = standing.faction;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.factionRow,
        {
          borderColor: faction.colors.border,
          backgroundColor: faction.colors.darkSurface,
        },
        pressed ? styles.factionRowPressed : null,
      ]}
    >
      <View style={styles.factionRankColumn}>
        <Text
          style={[
            styles.factionRank,
            {
              color: faction.colors.primary,
            },
          ]}
        >
          {formatRank(standing.rank)}
        </Text>

        <Text style={styles.factionRankLabel}>RANK</Text>
      </View>

      <View style={styles.factionEmblemContainer}>
        <Image
          source={factionEmblems[faction.slug]}
          style={styles.factionEmblem}
          resizeMode="contain"
        />
      </View>

      <View style={styles.factionIdentity}>
        <Text
          style={[
            styles.factionStandingName,
            {
              color: faction.colors.primary,
            },
          ]}
        >
          {faction.name.toUpperCase()}
        </Text>

        <Text style={styles.factionStandingLabel}>SEASON CONTRIBUTION</Text>
      </View>

      <View style={styles.factionXPColumn}>
        <Text style={styles.factionXP}>{formatXP(standing.seasonXP)}</Text>

        <Text style={styles.factionXPLabel}>SEASON XP</Text>
      </View>
    </Pressable>
  );
}

function getFactionColor(
  user: GlobalLeaderboardUser,
  factions: Faction[],
): string | null {
  if (!user.faction) {
    return null;
  }

  const faction = factions.find(
    (faction) => faction.slug === user.faction?.slug,
  );

  return faction?.colors.primary ?? null;
}

function formatXP(xp: number) {
  return xp.toLocaleString();
}

function formatRank(rank: number) {
  return String(rank).padStart(2, "0");
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 8,
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingTop: 22,
    paddingBottom: 120,
  },

  stateScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  stateTechnical: {
    color: colors.textTechnical,
    fontSize: 11,
    letterSpacing: 1.8,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  errorDescription: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },

  retryButtonPressed: {
    backgroundColor: colors.backgroundSelected,
  },

  retryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontFamily: Fonts.display,
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDeep,
    marginBottom: 28,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },

  activeTab: {
    backgroundColor: colors.backgroundSelected,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },

  activeTabText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  inactiveTabText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  currentPositionSection: {
    marginBottom: 30,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionIndex: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginRight: 10,
  },

  sectionTitleContainer: {
    flex: 1,
  },

  sectionEyebrow: {
    color: colors.textTechnical,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.6,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  currentUserCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    padding: 14,
  },

  userRowPressed: {
    opacity: 0.72,
  },

  currentRankBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 10,
    marginBottom: 12,
  },

  currentRankLabel: {
    color: colors.textTechnical,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  currentRank: {
    fontFamily: Fonts.display,
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  currentZenithRank: {
    color: "#FFB800",
  },

  currentIdentity: {
    flexDirection: "row",
    alignItems: "center",
  },

  currentZenithEmblem: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  globalRankMarker: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: colors.backgroundDeep,
  },

  globalRankMarkerText: {
    fontFamily: Fonts.display,
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "900",
  },

  currentUserInfo: {
    flex: 1,
    minWidth: 0,
  },

  currentUsername: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },

  currentMetadataRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 3,
  },

  currentLevel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  currentFaction: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  metadataDivider: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    marginHorizontal: 5,
  },

  currentXP: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },

  unrankedRank: {
    fontFamily: Fonts.display,
    color: colors.textDim,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  unrankedContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  unrankedMarker: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDeep,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  unrankedMarkerText: {
    fontFamily: Fonts.display,
    color: colors.textDim,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },

  unrankedInfo: {
    flex: 1,
  },

  unrankedTitle: {
    fontFamily: Fonts.display,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  unrankedDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 8,
  },

  leaderboardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  leaderboardCount: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: 8,
  },

  zenithRow: {
    backgroundColor: colors.backgroundElement,
  },

  rankColumn: {
    width: 38,
    alignItems: "center",
  },

  rankNumber: {
    fontFamily: Fonts.display,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "900",
  },

  zenithRankNumber: {
    color: "#FFB800",
  },

  rankLabel: {
    color: colors.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 2,
  },

  rowStatus: {
    width: 66,
    alignItems: "center",
    justifyContent: "center",
  },

  standardRankMarker: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDeep,
    alignItems: "center",
    justifyContent: "center",
  },

  standardRankMarkerText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "900",
  },

  rowIdentity: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },

  username: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },

  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },

  metadataLevel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  factionName: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  xpColumn: {
    alignItems: "flex-end",
    minWidth: 58,
    paddingHorizontal: 10,
  },

  xp: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
  },

  xpLabel: {
    color: colors.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  paginationLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 9,
  },

  paginationLoaderText: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  endMarker: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
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
    letterSpacing: 1.2,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },

  emptyDescription: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 7,
    textAlign: "center",
  },

  seasonPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 24,
  },

  seasonTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  seasonMetadata: {
    alignItems: "flex-end",
  },

  seasonQuarter: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },

  seasonYear: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  factionLeaderboardHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },

  factionState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 14,
  },

  factionRow: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  factionRowPressed: {
    opacity: 0.8,
  },

  factionRankColumn: {
    width: 36,
    alignItems: "center",
  },

  factionRank: {
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: "900",
  },

  factionRankLabel: {
    color: colors.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  factionEmblemContainer: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },

  factionEmblem: {
    width: 66,
    height: 66,
  },

  factionIdentity: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },

  factionStandingName: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  factionStandingLabel: {
    color: colors.textMuted,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 5,
  },

  factionXPColumn: {
    alignItems: "flex-end",
    minWidth: 64,
  },

  factionXP: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },

  factionXPLabel: {
    color: colors.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 3,
  },
});
