import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { BrandHeader } from "@/components/brand-header";
import { Colors, Fonts } from "@/constants/theme";
import { factionEmblems } from "@/constants/faction-assets";
import { getSeasonHistory } from "@/api/seasons";
import type { RootState } from "@/store/store";
export default function SeasonHistoryScreen() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["season-history", userId],
    queryFn: ({ pageParam }) => getSeasonHistory(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
    enabled: !!userId,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const rows = query.data?.pages.flatMap((page) => page.seasons) ?? [];
  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={() => {
          void query.refetch();
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              style={styles.linkButton}
              onPress={() => router.back()}
            >
              <Text style={styles.link}>← RANKINGS</Text>
            </Pressable>
            <BrandHeader label="FACTIONS" />
            <Text style={styles.title}>Season history</Text>
            <Text style={styles.text}>
              The factions that finished on top. Winners remain recorded after
              each season ends.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const faction = item.winningFaction;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.season}>SEASON {item.seasonNumber}</Text>
                <Text style={styles.meta}>
                  Q{item.quarter} / {item.year}
                </Text>
              </View>
              <Text style={styles.dates}>
                {new Date(item.startsAt).toLocaleDateString()} —{" "}
                {new Date(item.endsAt).toLocaleDateString()}
              </Text>
              <View style={styles.winner}>
                {faction ? (
                  <Image
                    source={factionEmblems[faction.slug]}
                    style={styles.emblem}
                    resizeMode="contain"
                  />
                ) : null}
                <View style={styles.winnerText}>
                  <Text style={styles.meta}>WINNING FACTION</Text>
                  <Text
                    style={[
                      styles.faction,
                      faction && { color: faction.colors.primary },
                    ]}
                  >
                    {faction?.name ?? "No winner recorded"}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator
              style={styles.state}
              color={Colors.dark.accent}
            />
          ) : query.isError ? (
            <View style={styles.state}>
              <Text style={styles.text}>
                Season history could not be loaded.
              </Text>
              <Pressable
                style={styles.linkButton}
                onPress={() => {
                  void query.refetch();
                }}
              >
                <Text style={styles.link}>TRY AGAIN →</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.state}>
              <Text style={styles.text}>
                No completed seasons yet. The first winner will appear here when
                the season ends.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          rows.length ? (
            <View style={styles.footer}>
              {query.isError ? (
                <Text style={styles.text}>
                  Unable to load more seasons. Try again.
                </Text>
              ) : null}
              {query.hasNextPage ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={query.isFetching}
                  style={styles.more}
                  onPress={() => {
                    void query.fetchNextPage();
                  }}
                >
                  <Text style={styles.link}>
                    {query.isFetchingNextPage
                      ? "LOADING..."
                      : "LOAD MORE SEASONS →"}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.meta}>ALL COMPLETED SEASONS</Text>
              )}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { paddingBottom: 40 },
  header: { paddingTop: 16, gap: 16, marginBottom: 24 },
  title: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.dark.text,
    fontWeight: "900",
  },
  text: { fontSize: 14, lineHeight: 22, color: Colors.dark.textSecondary },
  linkButton: { minHeight: 44, justifyContent: "center" },
  link: {
    color: Colors.dark.text,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    padding: 18,
    marginBottom: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  season: { color: Colors.dark.text, fontWeight: "900", fontSize: 18 },
  meta: { color: Colors.dark.textMuted, fontSize: 10, letterSpacing: 1 },
  dates: { color: Colors.dark.textSecondary, fontSize: 12 },
  winner: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
    paddingTop: 14,
  },
  emblem: { width: 48, height: 48 },
  winnerText: { flex: 1, gap: 6 },
  faction: {
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: "900",
    color: Colors.dark.text,
  },
  state: { paddingVertical: 32 },
  footer: { paddingTop: 12, gap: 12, paddingBottom: 24 },
  more: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
});
