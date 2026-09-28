import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { getMyWorkouts } from "@/api/workouts";

export default function WorkoutsScreen() {
  const [search, setSearch] = useState("");

  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: getMyWorkouts,
  });

  const workouts = workoutsQuery.data?.workouts ?? [];

  const filteredWorkouts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return workouts;
    }

    return workouts.filter((workout) =>
      workout.name.toLowerCase().includes(normalizedSearch),
    );
  }, [search, workouts]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ASCENDRA // TRAINING</Text>

          <Text style={styles.title}>SELECT_WORKOUT</Text>

          <Text style={styles.subtitle}>
            Choose a saved workout to begin a new session.
          </Text>
        </View>
      </View>

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
            placeholder="Search workouts"
            placeholderTextColor={Colors.dark.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionLabel}>YOUR_WORKOUTS</Text>
          <Text style={styles.sectionSubtext}>ACTIVE PROGRAMS</Text>
        </View>

        <Text style={styles.workoutCount}>
          {String(workouts.length).padStart(2, "0")}
        </Text>
      </View>

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
      ) : filteredWorkouts.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            {search.trim() ? "NO_MATCHING_WORKOUTS" : "NO_WORKOUTS_FOUND"}
          </Text>
        </View>
      ) : (
        <View style={styles.workoutList}>
          {filteredWorkouts.map((workout, index) => (
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
              <View style={styles.cardAccent} />

              <View style={styles.cardTopRow}>
                <Text style={styles.cardIndex}>
                  {String(index + 1).padStart(2, "0")}
                </Text>

                <Text style={styles.visibility}>
                  {workout.visibility.toUpperCase()}
                </Text>
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
                    {workout.exercises.length === 1 ? "EXERCISE" : "EXERCISES"}
                  </Text>
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
      )}

      <Pressable
        onPress={() => router.push("/workouts/create")}
        style={styles.createButton}
      >
        <Ionicons name="add" size={18} color={Colors.dark.accent} />

        <Text style={styles.createButtonText}>CREATE_NEW_WORKOUT</Text>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <View style={styles.footerNode} />
        <View style={styles.footerLine} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerText: {
    flex: 1,
  },

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

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
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

  createButton: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  createButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

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

  header: {
    marginBottom: 30,
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
    maxWidth: 300,
  },
});
