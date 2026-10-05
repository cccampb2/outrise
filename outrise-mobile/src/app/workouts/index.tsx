import { BrandHeader } from "@/components/brand-header";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { getMyWorkouts } from "@/api/workouts";

type WorkoutStatus = "active" | "archived";

export default function WorkoutsScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WorkoutStatus>("active");

  const normalizedSearch = search.trim();

  const workoutsQuery = useInfiniteQuery({
    queryKey: ["workouts", status, normalizedSearch],

    queryFn: ({ pageParam }) =>
      getMyWorkouts({
        page: pageParam,
        limit: 10,
        status,
        search: normalizedSearch || undefined,
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

  const workouts =
    workoutsQuery.data?.pages.flatMap((page) => page.workouts) ?? [];

  const totalWorkouts =
    workoutsQuery.data?.pages[0]?.pagination.totalWorkouts ?? 0;

  function handleStatusChange(nextStatus: WorkoutStatus) {
    setStatus(nextStatus);
    setSearch("");
  }

  return (
    <Screen scroll>
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <BrandHeader label="TRAINING" style={styles.brandLabelLayout} />

        <Text style={styles.title}>SELECT_WORKOUT</Text>

        <Text style={styles.subtitle}>
          Choose a saved workout to begin a new session.
        </Text>
      </View>

      {/* CREATE WORKOUT */}

      <Pressable
        onPress={() => router.push("/workouts/create")}
        style={({ pressed }) => [
          styles.createButton,
          pressed && styles.createButtonPressed,
        ]}
      >
        <View style={styles.createButtonIcon}>
          <Ionicons name="add" size={18} color={Colors.dark.accent} />
        </View>

        <View style={styles.createButtonContent}>
          <Text style={styles.createButtonText}>CREATE_NEW_WORKOUT</Text>

          <Text style={styles.createButtonSubtext}>
            Build a reusable workout prescription
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.dark.accent} />
      </Pressable>

      {/* STATUS SWITCH */}

      <View style={styles.statusSection}>
        <Text style={styles.sectionCode}>WORKOUT_STATUS</Text>

        <View style={styles.statusSwitch}>
          <Pressable
            onPress={() => handleStatusChange("active")}
            style={[
              styles.statusButton,
              status === "active" && styles.statusButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                status === "active" && styles.statusButtonTextSelected,
              ]}
            >
              ACTIVE
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleStatusChange("archived")}
            style={[
              styles.statusButton,
              status === "archived" && styles.statusButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                status === "archived" && styles.statusButtonTextSelected,
              ]}
            >
              ARCHIVED
            </Text>
          </Pressable>
        </View>
      </View>

      {/* SEARCH */}

      <View style={styles.searchSection}>
        <Text style={styles.sectionCode}>WORKOUT_DATABASE</Text>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={17}
            color={Colors.dark.textMuted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              status === "active"
                ? "Search active workouts"
                : "Search archived workouts"
            }
            placeholderTextColor={Colors.dark.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />

          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close" size={17} color={Colors.dark.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* WORKOUT LIST HEADER */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>
            {status === "active" ? "YOUR_WORKOUTS" : "ARCHIVED_WORKOUTS"}
          </Text>

          <Text style={styles.sectionSubtext}>
            {normalizedSearch
              ? "SEARCH_RESULTS"
              : status === "active"
                ? "ACTIVE_PROGRAMS"
                : "ARCHIVED_PROGRAMS"}
          </Text>
        </View>

        <Text style={styles.workoutCount}>
          {String(totalWorkouts).padStart(2, "0")}
        </Text>
      </View>

      {/* WORKOUT LIST */}

      {workoutsQuery.isPending ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={Colors.dark.accent} />

          <Text style={styles.stateText}>LOADING_WORKOUTS</Text>
        </View>
      ) : workoutsQuery.isError ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorCode}>CONNECTION_ERROR</Text>

          <Text style={styles.stateText}>Unable to load your workouts.</Text>

          <Pressable
            onPress={() => workoutsQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            {normalizedSearch
              ? "NO_MATCHING_WORKOUTS"
              : status === "active"
                ? "NO_ACTIVE_WORKOUTS"
                : "NO_ARCHIVED_WORKOUTS"}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.workoutList}>
            {workouts.map((workout, index) => (
              <Pressable
                key={workout._id}
                onPress={() =>
                  router.push({
                    pathname: "/workouts/[workoutId]",
                    params: {
                      workoutId: workout._id,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.workoutCard,
                  pressed && styles.workoutCardPressed,
                ]}
              >
                <View
                  style={[
                    styles.cardAccent,
                    status === "archived" && styles.cardAccentArchived,
                  ]}
                />

                <View style={styles.cardTopRow}>
                  <Text style={styles.cardIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>

                  <View style={styles.cardStatusRow}>
                    {status === "archived" ? (
                      <Text style={styles.archivedStatus}>ARCHIVED</Text>
                    ) : null}

                    <Text style={styles.visibility}>
                      {workout.visibility.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.workoutName}>
                  {workout.name.toUpperCase()}
                </Text>

                {workout.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {workout.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseCount}>
                      {String(workout.exercises.length).padStart(2, "0")}
                    </Text>

                    <Text style={styles.exerciseLabel}>
                      {workout.exercises.length === 1
                        ? "EXERCISE"
                        : "EXERCISES"}
                    </Text>
                  </View>

                  <View style={styles.openIndicator}>
                    <View style={styles.indicatorLine} />

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={
                        status === "active"
                          ? Colors.dark.accent
                          : Colors.dark.textMuted
                      }
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* LOAD MORE */}

          {workoutsQuery.hasNextPage ? (
            <Pressable
              disabled={workoutsQuery.isFetchingNextPage}
              onPress={() => workoutsQuery.fetchNextPage()}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed &&
                  !workoutsQuery.isFetchingNextPage &&
                  styles.loadMoreButtonPressed,
                workoutsQuery.isFetchingNextPage &&
                  styles.loadMoreButtonDisabled,
              ]}
            >
              {workoutsQuery.isFetchingNextPage ? (
                <>
                  <ActivityIndicator size="small" color={Colors.dark.accent} />

                  <Text style={styles.loadMoreText}>LOADING</Text>
                </>
              ) : (
                <>
                  <Text style={styles.loadMoreText}>LOAD_MORE</Text>

                  <Ionicons
                    name="chevron-down"
                    size={15}
                    color={Colors.dark.accent}
                  />
                </>
              )}
            </Pressable>
          ) : null}

          {/* LOADED COUNT */}

          <View style={styles.loadedStatus}>
            <View style={styles.loadedStatusLine} />

            <Text style={styles.loadedStatusText}>
              {`${workouts.length} / ${totalWorkouts} LOADED`}
            </Text>

            <View style={styles.loadedStatusLine} />
          </View>
        </>
      )}

      {/* FOOTER */}

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <View style={styles.footerNode} />
        <View style={styles.footerLine} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 10,
  },

  /* HEADER */

  header: {
    marginBottom: 20,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 24,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 300,
  },

  /* CREATE WORKOUT */

  createButton: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 28,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  createButtonPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderColor: Colors.dark.accent,
  },

  createButtonIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  createButtonContent: {
    flex: 1,
  },

  createButtonText: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  createButtonSubtext: {
    color: Colors.dark.textDim,
    fontSize: 8,
    lineHeight: 12,
    marginTop: 4,
  },

  /* STATUS */

  statusSection: {
    marginBottom: 20,
  },

  statusSwitch: {
    height: 44,
    flexDirection: "row",
    padding: 3,
    gap: 3,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  statusButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statusButtonSelected: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  statusButtonText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  statusButtonTextSelected: {
    color: Colors.dark.accent,
  },

  /* SEARCH */

  searchSection: {
    marginBottom: 28,
  },

  sectionCode: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  searchContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 13,
    paddingVertical: 0,
  },

  /* WORKOUT LIST */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  sectionSubtext: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginTop: 3,
  },

  workoutCount: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },

  workoutList: {
    gap: 10,
  },

  workoutCard: {
    position: "relative",
    overflow: "hidden",
    padding: 16,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  workoutCardPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderColor: Colors.dark.borderStrong,
  },

  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.dark.accent,
  },

  cardAccentArchived: {
    backgroundColor: Colors.dark.textDim,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  cardStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  archivedStatus: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  cardIndex: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  visibility: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  workoutName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
    paddingRight: 16,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 16,
  },

  exerciseInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },

  exerciseCount: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },

  exerciseLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  openIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  indicatorLine: {
    width: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderStrong,
  },

  /* LOAD MORE */

  loadMoreButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  loadMoreButtonPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderColor: Colors.dark.accent,
  },

  loadMoreButtonDisabled: {
    opacity: 0.55,
  },

  loadMoreText: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  loadedStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
  },

  loadedStatusLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  loadedStatusText: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* STATES */

  stateContainer: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },

  stateText: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
    textAlign: "center",
  },

  errorCode: {
    color: Colors.dark.danger,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  retryText: {
    color: Colors.dark.textSecondary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  /* FOOTER */

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 28,
    marginBottom: 12,
  },

  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  footerNode: {
    width: 4,
    height: 4,
    backgroundColor: Colors.dark.textDim,
    transform: [{ rotate: "45deg" }],
  },
});
