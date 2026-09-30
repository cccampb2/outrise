import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getFactionLeaderboard,
  type FactionLeaderboardUser,
} from "@/api/leaderboards";
import type { FactionSlug } from "@/api/factions";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";

const colors = Colors.dark;

const PAGE_SIZE = 25;

const factionBanners: Record<FactionSlug, number> = {
  helix: require("../../../../assets/images/factions/faction-helix.png"),
  aegis: require("../../../../assets/images/factions/faction-aegis.png"),
  nova: require("../../../../assets/images/factions/faction-nova.png"),
  rally: require("../../../../assets/images/factions/faction-rally.png"),
};

export default function FactionRankingsScreen() {
  const { factionSlug } = useLocalSearchParams<{
    factionSlug: FactionSlug;
  }>();

  const factionLeaderboardQuery = useInfiniteQuery({
    queryKey: ["leaderboards", "factions", factionSlug],

    queryFn: ({ pageParam }) =>
      getFactionLeaderboard({
        factionSlug,
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

    enabled: Boolean(factionSlug),
  });

  const firstPage = factionLeaderboardQuery.data?.pages[0];

  const faction = firstPage?.faction;

  const season = firstPage?.season ?? null;

  const factionStanding = firstPage?.factionStanding ?? null;

  const currentUser = firstPage?.currentUser ?? null;

  const members =
    factionLeaderboardQuery.data?.pages.flatMap((page) => page.leaderboard) ??
    [];

  function handleLoadMore() {
    if (
      factionLeaderboardQuery.hasNextPage &&
      !factionLeaderboardQuery.isFetchingNextPage
    ) {
      factionLeaderboardQuery.fetchNextPage();
    }
  }

  if (factionLeaderboardQuery.isPending) {
    return (
      <Screen>
        <View style={styles.stateScreen}>
          <ActivityIndicator size="large" color={colors.accent} />

          <Text style={styles.stateTechnical}>LOADING_FACTION_NETWORK</Text>
        </View>
      </Screen>
    );
  }

  if (factionLeaderboardQuery.isError || !faction) {
    return (
      <Screen>
        <View style={styles.stateScreen}>
          <Text style={styles.errorTitle}>FACTION_UNAVAILABLE</Text>

          <Text style={styles.errorDescription}>
            This faction could not be loaded.
          </Text>

          <Pressable
            onPress={() => factionLeaderboardQuery.refetch()}
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
      <FlatList
        style={styles.list}
        data={members}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <FactionMemberRow user={item} factionColor={faction.colors.primary} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.backButtonPressed : null,
              ]}
            >
              <Text style={styles.backButtonText}>← BACK</Text>
            </Pressable>

            <View style={styles.factionBannerSection}>
              <View
                style={[
                  styles.bannerFrame,
                  {
                    borderColor: faction.colors.border,
                  },
                ]}
              >
                <Image
                  source={factionBanners[faction.slug]}
                  style={styles.banner}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.bannerFooter}>
                <Text style={styles.bannerLabel}>ASCENDRA // FACTION</Text>

                <Text
                  style={[
                    styles.bannerStatus,
                    {
                      color: faction.colors.primary,
                    },
                  ]}
                >
                  {faction.name.toUpperCase()} // ACTIVE
                </Text>
              </View>
            </View>

            {season ? (
              <View style={styles.seasonHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>ACTIVE_SEASON</Text>

                  <Text style={styles.seasonTitle}>
                    SEASON {season.seasonNumber}
                  </Text>
                </View>

                <View style={styles.seasonMetadata}>
                  <Text
                    style={[
                      styles.seasonQuarter,
                      {
                        color: faction.colors.primary,
                      },
                    ]}
                  >
                    Q{season.quarter}
                  </Text>

                  <Text style={styles.seasonYear}>{season.year}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.factionStats}>
              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: faction.colors.border,
                  },
                ]}
              >
                <Text style={styles.statLabel}>SEASON STANDING</Text>

                <Text
                  style={[
                    styles.statValue,
                    {
                      color: faction.colors.primary,
                    },
                  ]}
                >
                  {factionStanding
                    ? `#${formatRank(factionStanding.rank)}`
                    : "#---"}
                </Text>

                <Text style={styles.statMetadata}>GLOBAL FACTION RANK</Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    borderColor: faction.colors.border,
                  },
                ]}
              >
                <Text style={styles.statLabel}>SEASON XP</Text>

                <Text
                  style={[
                    styles.statValue,
                    {
                      color: faction.colors.primary,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatXP(factionStanding?.seasonXP ?? 0)}
                </Text>

                <Text style={styles.statMetadata}>FACTION TOTAL</Text>
              </View>
            </View>

            <View style={styles.currentPositionSection}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionIndex,
                    {
                      color: faction.colors.primary,
                    },
                  ]}
                >
                  01
                </Text>

                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionEyebrow}>YOUR_CONTRIBUTION</Text>

                  <Text style={styles.sectionTitle}>SEASON PERFORMANCE</Text>
                </View>
              </View>

              {currentUser ? (
                <View
                  style={[
                    styles.currentUserCard,
                    {
                      borderColor: faction.colors.border,
                      backgroundColor: faction.colors.darkSurface,
                    },
                  ]}
                >
                  <View style={styles.currentUserRank}>
                    <Text style={styles.currentUserRankLabel}>
                      FACTION RANK
                    </Text>

                    <Text
                      style={[
                        styles.currentUserRankValue,
                        {
                          color: faction.colors.primary,
                        },
                      ]}
                    >
                      #{formatRank(currentUser.rank)}
                    </Text>
                  </View>

                  <View style={styles.currentUserDetails}>
                    <Text style={styles.currentUsername} numberOfLines={1}>
                      {currentUser.username}
                    </Text>

                    <Text style={styles.currentUserContribution}>
                      {formatXP(currentUser.seasonXP)} SEASON XP
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.unrankedCard,
                    {
                      borderColor: faction.colors.border,
                    },
                  ]}
                >
                  <Text style={styles.unrankedTitle}>
                    NO SEASON CONTRIBUTION
                  </Text>

                  <Text style={styles.unrankedDescription}>
                    Only members of this faction who have earned season XP
                    appear in these standings.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.memberHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>FACTION_NETWORK</Text>

                <Text style={styles.memberTitle}>MEMBER STANDINGS</Text>
              </View>

              <Text style={styles.memberCount}>
                {firstPage?.pagination.totalUsers ?? 0} MEMBERS
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>NO_SEASON_CONTRIBUTIONS</Text>

            <Text style={styles.emptyDescription}>
              Member standings will appear when this faction begins earning XP
              this season.
            </Text>
          </View>
        }
        ListFooterComponent={
          factionLeaderboardQuery.isFetchingNextPage ? (
            <View style={styles.paginationLoader}>
              <ActivityIndicator size="small" color={faction.colors.primary} />

              <Text style={styles.paginationLoaderText}>
                LOADING_MORE_MEMBERS
              </Text>
            </View>
          ) : members.length > 0 && !factionLeaderboardQuery.hasNextPage ? (
            <View style={styles.endMarker}>
              <View style={styles.endMarkerLine} />

              <Text style={styles.endMarkerText}>END_OF_FACTION_STANDINGS</Text>

              <View style={styles.endMarkerLine} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function FactionMemberRow({
  user,
  factionColor,
}: {
  user: FactionLeaderboardUser;
  factionColor: string;
}) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberRankColumn}>
        <Text
          style={[
            styles.memberRank,
            {
              color: factionColor,
            },
          ]}
        >
          {formatRank(user.rank)}
        </Text>

        <Text style={styles.memberRankLabel}>RANK</Text>
      </View>

      <View style={styles.memberIdentity}>
        <Text style={styles.memberUsername} numberOfLines={1}>
          {user.username}
        </Text>

        <Text style={styles.memberContributionLabel}>SEASON CONTRIBUTION</Text>
      </View>

      <View style={styles.memberXPColumn}>
        <Text style={styles.memberXP}>{formatXP(user.seasonXP)}</Text>

        <Text style={styles.memberXPLabel}>SEASON XP</Text>
      </View>
    </View>
  );
}

function formatXP(xp: number) {
  return xp.toLocaleString();
}

function formatRank(rank: number) {
  return String(rank).padStart(2, "0");
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },

  listContent: {
    paddingTop: 18,
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
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  errorDescription: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },

  retryButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 4,
  },

  retryButtonPressed: {
    backgroundColor: colors.backgroundSelected,
  },

  retryButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 12,
  },

  backButtonPressed: {
    opacity: 0.65,
  },

  backButtonText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  factionBannerSection: {
    marginBottom: 24,
  },

  bannerFrame: {
    width: "100%",
    aspectRatio: 3,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: colors.backgroundElement,
  },

  banner: {
    width: "100%",
    height: "100%",
  },

  bannerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  bannerLabel: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  bannerStatus: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 12,
  },

  sectionEyebrow: {
    color: colors.textTechnical,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  seasonTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  seasonMetadata: {
    alignItems: "flex-end",
  },

  seasonQuarter: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },

  seasonYear: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  factionStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },

  statLabel: {
    color: colors.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  statValue: {
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5,
  },

  statMetadata: {
    color: colors.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 3,
  },

  currentPositionSection: {
    marginBottom: 30,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  sectionIndex: {
    fontSize: 11,
    fontWeight: "900",
    marginRight: 10,
  },

  sectionTitleContainer: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 2,
  },

  currentUserCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 14,
  },

  currentUserRank: {
    width: 86,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
    marginRight: 14,
  },

  currentUserRankLabel: {
    color: colors.textTechnical,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  currentUserRankValue: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },

  currentUserDetails: {
    flex: 1,
    minWidth: 0,
  },

  currentUsername: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },

  currentUserContribution: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 5,
  },

  unrankedCard: {
    borderWidth: 1,
    backgroundColor: colors.backgroundElement,
    padding: 14,
  },

  unrankedTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  unrankedDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  memberHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 5,
  },

  memberTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 2,
  },

  memberCount: {
    color: colors.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  memberRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: 9,
  },

  memberRankColumn: {
    width: 48,
    alignItems: "center",
  },

  memberRank: {
    fontSize: 16,
    fontWeight: "900",
  },

  memberRankLabel: {
    color: colors.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 2,
  },

  memberIdentity: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
  },

  memberUsername: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },

  memberContributionLabel: {
    color: colors.textMuted,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 4,
  },

  memberXPColumn: {
    minWidth: 80,
    alignItems: "flex-end",
  },

  memberXP: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
  },

  memberXPLabel: {
    color: colors.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 3,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 45,
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
    lineHeight: 15,
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
