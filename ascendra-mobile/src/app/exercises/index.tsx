import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import {
  getExerciseMuscleGroups,
  getExercises,
  type ExerciseCategory,
} from "@/api/exercises";

type CategoryFilter = "all" | ExerciseCategory;

const CATEGORY_FILTERS: {
  label: string;
  value: CategoryFilter;
}[] = [
  {
    label: "ALL",
    value: "all",
  },
  {
    label: "STRENGTH",
    value: "strength",
  },
  {
    label: "CARDIO",
    value: "cardio",
  },
  {
    label: "BODYWEIGHT",
    value: "bodyweight",
  },
  {
    label: "MOBILITY",
    value: "mobility",
  },
];

export default function ExerciseLibraryScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);

  const normalizedSearch = search.trim();

  /*
   * MUSCLE GROUP METADATA
   *
   * This query is intentionally separate from the exercise-results query.
   *
   * The muscle-group buttons should represent all muscle groups available
   * in the exercise database. They should not change just because the user
   * selected one of the filters.
   */
  const muscleGroupsQuery = useQuery({
    queryKey: ["exercises", "muscle-groups"],
    queryFn: getExerciseMuscleGroups,
  });

  /*
   * EXERCISE RESULTS
   *
   * This query changes whenever category, muscle group, or search changes.
   *
   * Because those values are part of the queryKey, TanStack Query treats
   * each filter combination as its own cached query.
   */
  const exercisesQuery = useInfiniteQuery({
    queryKey: ["exercises", "library", category, muscleGroup, normalizedSearch],

    queryFn: ({ pageParam }) =>
      getExercises({
        page: pageParam,
        limit: 20,

        category: category === "all" ? undefined : category,

        muscleGroup: muscleGroup ?? undefined,

        search: normalizedSearch || undefined,
      }),

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasNextPage) {
        return undefined;
      }

      return lastPage.pagination.page + 1;
    },
  });

  const exercises =
    exercisesQuery.data?.pages.flatMap((page) => page.exercises) ?? [];

  const availableMuscleGroups = muscleGroupsQuery.data?.muscleGroups ?? [];

  const totalExercises =
    exercisesQuery.data?.pages[0]?.pagination.totalExercises ?? 0;

  function handleCategoryChange(nextCategory: CategoryFilter) {
    setCategory(nextCategory);

    /*
     * Clear the muscle filter when switching categories.
     *
     * Otherwise a combination such as:
     *
     * strength + chest
     *
     * could become:
     *
     * cardio + chest
     *
     * which may legitimately return zero results and make it look like
     * the category filter is broken.
     */
    setMuscleGroup(null);
  }

  return (
    <Screen scroll>
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <Text style={styles.eyebrow}>ASCENDRA // TRAINING</Text>

        <Text style={styles.title}>EXERCISE_LIBRARY</Text>

        <Text style={styles.subtitle}>
          Browse movements, training methods, and exercise prescriptions.
        </Text>
      </View>

      {/* SEARCH */}

      <View style={styles.searchSection}>
        <Text style={styles.sectionCode}>EXERCISE_DATABASE</Text>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={17}
            color={Colors.dark.textMuted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
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

      {/* CATEGORY FILTERS */}

      <View style={styles.filterSection}>
        <Text style={styles.sectionCode}>FILTER_BY_CATEGORY</Text>

        <View style={styles.filterGrid}>
          {CATEGORY_FILTERS.map((filter) => {
            const selected = category === filter.value;

            return (
              <Pressable
                key={filter.value}
                onPress={() => handleCategoryChange(filter.value)}
                style={({ pressed }) => [
                  styles.filterButton,
                  selected && styles.filterButtonSelected,
                  pressed && styles.filterButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* MUSCLE GROUP FILTERS */}

      <View style={styles.muscleFilterSection}>
        <View style={styles.muscleFilterHeader}>
          <Text style={styles.sectionCode}>FILTER_BY_MUSCLE_GROUP</Text>

          {muscleGroup ? (
            <Pressable onPress={() => setMuscleGroup(null)} hitSlop={8}>
              <Text style={styles.clearFilterText}>CLEAR</Text>
            </Pressable>
          ) : null}
        </View>

        {muscleGroupsQuery.isPending ? (
          <View style={styles.filterLoadingContainer}>
            <ActivityIndicator size="small" color={Colors.dark.accent} />

            <Text style={styles.filterLoadingText}>LOADING_MUSCLE_GROUPS</Text>
          </View>
        ) : muscleGroupsQuery.isError ? (
          <View style={styles.filterErrorContainer}>
            <Text style={styles.filterErrorText}>
              UNABLE_TO_LOAD_MUSCLE_GROUPS
            </Text>

            <Pressable onPress={() => muscleGroupsQuery.refetch()} hitSlop={8}>
              <Text style={styles.filterRetryText}>RETRY</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.filterGrid}>
            {/* ALL MUSCLE GROUPS */}

            <Pressable
              onPress={() => setMuscleGroup(null)}
              style={({ pressed }) => [
                styles.filterButton,
                muscleGroup === null && styles.filterButtonSelected,
                pressed && styles.filterButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  muscleGroup === null && styles.filterTextSelected,
                ]}
              >
                ALL
              </Text>
            </Pressable>

            {/* DATABASE MUSCLE GROUPS */}

            {availableMuscleGroups.map((availableMuscleGroup) => {
              const selected = muscleGroup === availableMuscleGroup;

              return (
                <Pressable
                  key={availableMuscleGroup}
                  onPress={() => setMuscleGroup(availableMuscleGroup)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    selected && styles.filterButtonSelected,
                    pressed && styles.filterButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.filterTextSelected,
                    ]}
                  >
                    {availableMuscleGroup.replaceAll("_", " ").toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* RESULTS HEADER */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>EXERCISES</Text>

          <Text style={styles.sectionSubtext}>
            {normalizedSearch
              ? "SEARCH_RESULTS"
              : muscleGroup
                ? `${muscleGroup.replaceAll("_", " ").toUpperCase()}_MOVEMENTS`
                : category === "all"
                  ? "ALL_MOVEMENTS"
                  : `${category.toUpperCase()}_MOVEMENTS`}
          </Text>
        </View>

        <Text style={styles.exerciseTotal}>
          {String(totalExercises).padStart(2, "0")}
        </Text>
      </View>

      {/* RESULTS */}

      {exercisesQuery.isPending ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={Colors.dark.accent} />

          <Text style={styles.stateText}>LOADING_EXERCISES</Text>
        </View>
      ) : exercisesQuery.isError ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorCode}>CONNECTION_ERROR</Text>

          <Text style={styles.stateText}>
            Unable to load the exercise library.
          </Text>

          <Pressable
            onPress={() => exercisesQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
        </View>
      ) : exercises.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            {normalizedSearch || muscleGroup || category !== "all"
              ? "NO_MATCHING_EXERCISES"
              : "NO_EXERCISES_FOUND"}
          </Text>
        </View>
      ) : (
        <>
          {/* EXERCISE LIST */}

          <View style={styles.exerciseList}>
            {exercises.map((exercise, index) => (
              <Pressable
                key={exercise._id}
                onPress={() =>
                  router.push({
                    pathname: "/exercises/[exerciseId]",
                    params: {
                      exerciseId: exercise._id,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.exerciseCard,
                  pressed && styles.exerciseCardPressed,
                ]}
              >
                <View style={styles.cardAccent} />

                <View style={styles.cardTopRow}>
                  <Text style={styles.cardIndex}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>

                  <Text style={styles.exerciseCategory}>
                    {exercise.category.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.exerciseName}>
                  {exercise.name.toUpperCase()}
                </Text>

                {exercise.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {exercise.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.exerciseMetadata}>
                    <Text style={styles.measurementType}>
                      {exercise.measurementType
                        .replaceAll("_", " ")
                        .toUpperCase()}
                    </Text>

                    {exercise.muscleGroups.length > 0 ? (
                      <Text style={styles.muscleGroups} numberOfLines={1}>
                        {exercise.muscleGroups
                          .slice(0, 3)
                          .join(" // ")
                          .toUpperCase()}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.openIndicator}>
                    <View style={styles.indicatorLine} />

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.dark.accent}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* LOAD MORE */}

          {exercisesQuery.hasNextPage ? (
            <Pressable
              disabled={exercisesQuery.isFetchingNextPage}
              onPress={() => exercisesQuery.fetchNextPage()}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed &&
                  !exercisesQuery.isFetchingNextPage &&
                  styles.loadMoreButtonPressed,
                exercisesQuery.isFetchingNextPage &&
                  styles.loadMoreButtonDisabled,
              ]}
            >
              {exercisesQuery.isFetchingNextPage ? (
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

          {/* LOADED STATUS */}

          <View style={styles.loadedStatus}>
            <View style={styles.loadedStatusLine} />

            <Text style={styles.loadedStatusText}>
              {`${exercises.length} / ${totalExercises} LOADED`}
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
  header: {
    marginBottom: 28,
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

  eyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  title: {
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
    maxWidth: 320,
  },

  /* SEARCH */

  searchSection: {
    marginBottom: 22,
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

  /* FILTERS */

  filterSection: {
    marginBottom: 28,
  },

  muscleFilterSection: {
    marginBottom: 28,
  },

  muscleFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  clearFilterText: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  filterButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  filterButtonSelected: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderColor: Colors.dark.borderStrong,
  },

  filterButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  filterText: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  filterTextSelected: {
    color: Colors.dark.accent,
  },

  filterLoadingContainer: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  filterLoadingText: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  filterErrorContainer: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filterErrorText: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  filterRetryText: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* RESULTS HEADER */

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

  exerciseTotal: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* EXERCISE CARDS */

  exerciseList: {
    gap: 8,
  },

  exerciseCard: {
    position: "relative",
    overflow: "hidden",
    padding: 15,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  exerciseCardPressed: {
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

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  cardIndex: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  exerciseCategory: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
    paddingRight: 12,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 14,
  },

  exerciseMetadata: {
    flex: 1,
    paddingRight: 12,
  },

  measurementType: {
    color: Colors.dark.textSecondary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  muscleGroups: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginTop: 5,
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

  /* PAGINATION */

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
