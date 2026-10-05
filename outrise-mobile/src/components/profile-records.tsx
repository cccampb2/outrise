import { AppText as Text } from "@/components/app-text";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useCallback } from "react";
import { ProfileAchievements } from "@/components/profile-achievements";
import { useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  getProfilePerformances,
  type ProfilePerformance,
} from "@/api/profile-records";
import { Colors } from "@/constants/theme";

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function performanceLabel(record: ProfilePerformance) {
  const { reps, weightLbs, distanceMiles, timeSeconds } = record.performance;
  const time =
    timeSeconds == null
      ? "—"
      : `${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, "0")}`;
  switch (record.measurementType) {
    case "weight_reps":
      return `${weightLbs ?? "—"} lb × ${reps ?? "—"} reps`;
    case "reps":
      return `${reps ?? "—"} reps`;
    case "distance_time":
      return `${distanceMiles ?? "—"} miles // ${time}`;
    default:
      return time;
  }
}

export function ProfileRecords({ userId }: { userId: string }) {
  const performances = useInfiniteQuery({
    queryKey: ["profile-records", userId, "performances"],
    queryFn: ({ pageParam }) => getProfilePerformances(userId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
  });
  const { refetch: refreshPerformances } = performances;
  useFocusEffect(
    useCallback(() => {
      void refreshPerformances();
    }, [refreshPerformances]),
  );
  return (
    <View style={styles.container}>
      <ProfileAchievements userId={userId} />
      <Text style={[styles.eyebrow, styles.secondSection]}>
        APPROVED_PERFORMANCES //{" "}
        {performances.data?.pages[0]?.pagination.total ?? 0}
      </Text>
      <Text style={styles.title}>Verified Performances</Text>
      {performances.isPending ? (
        <ActivityIndicator color={Colors.dark.accent} />
      ) : (
        performances.data?.pages
          .flatMap((page) => page.performances)
          .map((record) => (
            <View key={record.id} style={styles.card}>
              <View style={styles.heading}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={Colors.dark.accent}
                />
                <Text style={styles.name}>
                  {record.exercise?.name ?? "Verified exercise"}
                </Text>
              </View>
              <Text style={styles.performance}>{performanceLabel(record)}</Text>
              <Text style={styles.date}>
                APPROVED
                {record.approvedAt ? ` // ${dateLabel(record.approvedAt)}` : ""}
              </Text>
            </View>
          ))
      )}
      {!performances.isPending &&
        !performances.isError &&
        performances.data?.pages[0]?.pagination.total === 0 && (
          <Text style={styles.empty}>No approved performances yet.</Text>
        )}
      {performances.isError && (
        <Text style={styles.empty}>Unable to load verified performances.</Text>
      )}
      {(performances.isError || performances.hasNextPage) && (
        <Pressable
          accessibilityRole="button"
          disabled={performances.isFetching}
          onPress={() => {
            if (
              performances.hasNextPage &&
              (!performances.isError || performances.isFetchNextPageError)
            )
              void performances.fetchNextPage();
            else void performances.refetch();
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {performances.isFetching
              ? "LOADING..."
              : performances.isError
                ? "RETRY"
                : "VIEW MORE →"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 30 },
  eyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 14,
  },
  secondSection: { marginTop: 26 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    marginBottom: 10,
    gap: 9,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { color: Colors.dark.text, fontSize: 14, fontWeight: "700", flex: 1 },
  description: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  date: { color: Colors.dark.textTechnical, fontSize: 9, letterSpacing: 0.5 },
  performance: { color: Colors.dark.text, fontSize: 18, fontWeight: "700" },
  empty: { color: Colors.dark.textMuted, fontSize: 12, paddingVertical: 12 },
  button: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },
  buttonText: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
