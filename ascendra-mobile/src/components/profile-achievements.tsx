import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getProfileAchievements } from "@/api/profile-records";
import { Colors } from "@/constants/theme";

export function ProfileAchievements({
  userId,
  showAll = false,
}: {
  userId: string;
  showAll?: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey: [
      "profile-records",
      userId,
      "achievements",
      showAll ? "catalog" : "preview",
    ],
    queryFn: ({ pageParam }) =>
      getProfileAchievements(
        userId,
        pageParam,
        showAll ? 18 : 6,
        showAll ? "catalog" : "unlocked",
      ),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const unlocks = query.data?.pages.flatMap((page) => page.achievements) ?? [];
  const visible = showAll ? unlocks : unlocks.slice(0, 6);
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>
          Achievements{" "}
          <Text style={styles.count}>
            ({query.data?.pages[0]?.pagination.total ?? 0})
          </Text>
        </Text>
        {!showAll && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/users/achievements",
                params: { userId },
              })
            }
            style={styles.link}
          >
            <Text style={styles.linkText}>SEE ALL →</Text>
          </Pressable>
        )}
      </View>
      {query.isPending && <ActivityIndicator color={Colors.dark.accent} />}
      <View style={styles.grid}>
        {visible.map((unlock) => {
          const secret = unlock.unlocked && unlock.achievement?.isSecret;
          return (
            <View
              key={unlock.id}
              style={[
                styles.tile,
                showAll ? styles.detailTile : styles.squareTile,
                !unlock.unlocked && styles.lockedTile,
                secret && styles.secretTile,
              ]}
            >
              <Ionicons
                name={
                  unlock.unlocked ? "ribbon-outline" : "lock-closed-outline"
                }
                size={28}
                color={
                  !unlock.unlocked
                    ? Colors.dark.textMuted
                    : secret
                      ? "#39FF14"
                      : Colors.dark.accent
                }
              />
              <Text
                style={[
                  styles.name,
                  !unlock.unlocked && styles.lockedText,
                  secret && styles.secretText,
                ]}
                numberOfLines={showAll ? undefined : 3}
              >
                {unlock.achievement?.name ?? "Unlocked achievement"}
              </Text>
              {showAll && (
                <Text
                  style={[
                    styles.description,
                    !unlock.unlocked && styles.lockedText,
                  ]}
                >
                  {unlock.achievement?.description}
                </Text>
              )}
              {showAll && (
                <Text style={[styles.date, secret && styles.secretText]}>
                  {unlock.unlocked
                    ? `${secret ? "SECRET UNLOCKED" : "UNLOCKED"}${unlock.unlockedAt ? ` · ${new Date(unlock.unlockedAt).toLocaleDateString()}` : ""}`
                    : "LOCKED"}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      {!query.isPending && !query.isError && visible.length === 0 && (
        <Text style={styles.empty}>
          {showAll
            ? "No achievements available yet."
            : "No achievements unlocked yet."}
        </Text>
      )}
      {query.isError && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void query.refetch();
          }}
          style={styles.link}
        >
          <Text style={styles.linkText}>
            Unable to load achievements. Tap to retry.
          </Text>
        </Pressable>
      )}
      {showAll && query.hasNextPage && (
        <Pressable
          accessibilityRole="button"
          disabled={query.isFetching}
          onPress={() => {
            void query.fetchNextPage();
          }}
          style={styles.link}
        >
          <Text style={styles.linkText}>
            {query.isFetching ? "LOADING..." : "VIEW MORE →"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  title: { color: Colors.dark.text, fontSize: 18, fontWeight: "800", flex: 1 },
  count: { color: Colors.dark.textMuted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    padding: 8,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  squareTile: { width: "31.5%", aspectRatio: 1 },
  detailTile: { width: "100%", padding: 16 },
  lockedTile: { opacity: 0.65 },
  lockedText: { color: Colors.dark.textMuted },
  secretTile: { borderColor: "#39FF14", backgroundColor: "#081407" },
  secretText: { color: "#39FF14" },
  name: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  date: { color: Colors.dark.textMuted, fontSize: 9 },
  empty: { color: Colors.dark.textMuted, fontSize: 12, paddingVertical: 12 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { color: Colors.dark.accent, fontSize: 10, fontWeight: "800" },
});
