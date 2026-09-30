import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/components/screen";
import { WorkoutExerciseTarget } from "@/components/workouts/workout-exercise-target";
import { Colors } from "@/constants/theme";
import {
  createWorkout,
  type CreateWorkoutInput,
  type WorkoutVisibility,
} from "@/api/workouts";
import { getExercises, type Exercise } from "@/api/exercises";
import type { WorkoutTarget } from "@/api/workout-sessions";
import { ApiError } from "@/api/client";

type SelectedExercise = {
  exercise: Exercise;
  target: WorkoutTarget;
};

export default function CreateWorkoutScreen() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [visibility, setVisibility] = useState<WorkoutVisibility>("private");

  const [exerciseSearch, setExerciseSearch] = useState("");

  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);

  const [formError, setFormError] = useState<string | null>(null);

  const exercisesQuery = useInfiniteQuery({
    queryKey: ["exercises", exerciseSearch],

    queryFn: ({ pageParam }) =>
      getExercises({
        page: pageParam,
        search: exerciseSearch.trim() || undefined,
        limit: 20,
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

  const createWorkoutMutation = useMutation({
    mutationFn: (input: CreateWorkoutInput) => createWorkout(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workouts"],
      });

      router.back();
    },
  });

  function handleAddExercise(exercise: Exercise) {
    setFormError(null);

    setSelectedExercises((currentExercises) => {
      const alreadySelected = currentExercises.some(
        (selectedExercise) => selectedExercise.exercise._id === exercise._id,
      );

      if (alreadySelected) {
        return currentExercises;
      }

      return [
        ...currentExercises,
        {
          exercise,
          target: {},
        },
      ];
    });
  }

  function handleRemoveExercise(exerciseId: string) {
    setFormError(null);

    setSelectedExercises((currentExercises) =>
      currentExercises.filter(
        (selectedExercise) => selectedExercise.exercise._id !== exerciseId,
      ),
    );
  }

  function handleTargetChange(
    exerciseId: string,
    field: keyof WorkoutTarget,
    value: number | undefined,
  ) {
    setFormError(null);

    setSelectedExercises((currentExercises) =>
      currentExercises.map((selectedExercise) => {
        if (selectedExercise.exercise._id !== exerciseId) {
          return selectedExercise;
        }

        return {
          ...selectedExercise,
          target: {
            ...selectedExercise.target,
            [field]: value,
          },
        };
      }),
    );
  }

  function validateSelectedExerciseTargets() {
    for (const selectedExercise of selectedExercises) {
      const { exercise, target } = selectedExercise;

      if (exercise.measurementType === "weight_reps") {
        if (target.sets === undefined) {
          return `${exercise.name} requires sets.`;
        }

        if (target.reps === undefined) {
          return `${exercise.name} requires reps.`;
        }
      }

      if (exercise.measurementType === "reps") {
        if (target.sets === undefined) {
          return `${exercise.name} requires sets.`;
        }

        if (target.reps === undefined) {
          return `${exercise.name} requires reps.`;
        }
      }

      if (exercise.measurementType === "time") {
        if (target.timeSeconds === undefined) {
          return `${exercise.name} requires a target time.`;
        }
      }

      if (exercise.measurementType === "distance_time") {
        if (target.distanceMiles === undefined) {
          return `${exercise.name} requires a distance.`;
        }
      }

      if (exercise.measurementType === "duration") {
        if (target.timeSeconds === undefined) {
          return `${exercise.name} requires a duration.`;
        }
      }

      if (exercise.measurementType === "intervals") {
        if (target.workSeconds === undefined) {
          return `${exercise.name} requires a work duration.`;
        }

        if (target.recoverySeconds === undefined) {
          return `${exercise.name} requires a recovery duration.`;
        }

        if (target.rounds === undefined) {
          return `${exercise.name} requires rounds.`;
        }
      }
    }

    return null;
  }

  function handleCreateWorkout() {
    setFormError(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Enter a workout name.");
      return;
    }

    if (selectedExercises.length === 0) {
      setFormError("Add at least one exercise.");
      return;
    }

    const targetError = validateSelectedExerciseTargets();

    if (targetError) {
      setFormError(targetError);
      return;
    }

    const trimmedDescription = description.trim();

    const input: CreateWorkoutInput = {
      name: trimmedName,
      visibility,

      ...(trimmedDescription ? { description: trimmedDescription } : {}),

      exercises: selectedExercises.map((selectedExercise, index) => ({
        exercise: selectedExercise.exercise._id,
        order: index,
        target: selectedExercise.target,
      })),
    };

    createWorkoutMutation.mutate(input);
  }

  function getCreateErrorMessage() {
    if (formError) {
      return formError;
    }

    if (!createWorkoutMutation.isError) {
      return null;
    }

    if (createWorkoutMutation.error instanceof ApiError) {
      return createWorkoutMutation.error.getDisplayMessage();
    }

    return "Unable to create workout.";
  }

  const createErrorMessage = getCreateErrorMessage();

  const createDisabled =
    createWorkoutMutation.isPending ||
    name.trim().length === 0 ||
    selectedExercises.length === 0;

  return (
    <Screen scroll keyboardAvoiding>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>ASCENDRA // TRAINING</Text>

        <Text style={styles.title}>CREATE_WORKOUT</Text>

        <Text style={styles.subtitle}>Build a reusable workout.</Text>
      </View>

      {/* WORKOUT DETAILS */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>01</Text>

        <Text style={styles.sectionTitle}>WORKOUT_DETAILS</Text>
      </View>

      <View style={styles.form}>
        <View>
          <Text style={styles.inputLabel}>WORKOUT_NAME</Text>

          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              setFormError(null);
            }}
            placeholder="Push Day"
            placeholderTextColor={Colors.dark.textDim}
            maxLength={100}
            style={styles.input}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>DESCRIPTION</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional workout description"
            placeholderTextColor={Colors.dark.textDim}
            maxLength={1000}
            multiline
            style={[styles.input, styles.descriptionInput]}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>VISIBILITY</Text>

          <View style={styles.visibilityRow}>
            <Pressable
              onPress={() => setVisibility("private")}
              style={[
                styles.visibilityButton,
                visibility === "private" && styles.visibilityButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "private" && styles.visibilityTextSelected,
                ]}
              >
                PRIVATE
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setVisibility("public")}
              style={[
                styles.visibilityButton,
                visibility === "public" && styles.visibilityButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "public" && styles.visibilityTextSelected,
                ]}
              >
                PUBLIC
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* EXERCISES */}

      <View style={styles.exerciseSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>02</Text>

          <Text style={styles.sectionTitle}>EXERCISES</Text>
        </View>

        <Text style={styles.exerciseSectionDescription}>
          Search the exercise database and add movements to this workout.
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={17}
            color={Colors.dark.textMuted}
          />

          <TextInput
            value={exerciseSearch}
            onChangeText={setExerciseSearch}
            placeholder="Search exercises"
            placeholderTextColor={Colors.dark.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>

        {exercisesQuery.isPending ? (
          <Text style={styles.exerciseStateText}>LOADING_EXERCISES...</Text>
        ) : exercisesQuery.isError ? (
          <Text style={styles.exerciseErrorText}>UNABLE_TO_LOAD_EXERCISES</Text>
        ) : (
          <View style={styles.exerciseResults}>
            {exercises.map((exercise) => {
              const isSelected = selectedExercises.some(
                (selectedExercise) =>
                  selectedExercise.exercise._id === exercise._id,
              );

              return (
                <Pressable
                  key={exercise._id}
                  disabled={isSelected}
                  onPress={() => handleAddExercise(exercise)}
                  style={[
                    styles.exerciseResult,
                    isSelected && styles.exerciseResultSelected,
                  ]}
                >
                  <View style={styles.exerciseResultInfo}>
                    <Text style={styles.exerciseResultName}>
                      {exercise.name}
                    </Text>

                    <Text style={styles.exerciseResultMetadata}>
                      {exercise.category.toUpperCase()} //{" "}
                      {exercise.measurementType
                        .replaceAll("_", " ")
                        .toUpperCase()}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.addExerciseText,
                      isSelected && styles.addExerciseTextSelected,
                    ]}
                  >
                    {isSelected ? "ADDED" : "+ ADD"}
                  </Text>
                </Pressable>
              );
            })}

            {exercises.length === 0 ? (
              <Text style={styles.exerciseStateText}>NO_EXERCISES_FOUND</Text>
            ) : null}

            {exercisesQuery.hasNextPage ? (
              <Pressable
                disabled={exercisesQuery.isFetchingNextPage}
                onPress={() => exercisesQuery.fetchNextPage()}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  pressed && styles.loadMoreButtonPressed,
                  exercisesQuery.isFetchingNextPage &&
                    styles.loadMoreButtonDisabled,
                ]}
              >
                <Text style={styles.loadMoreText}>
                  {exercisesQuery.isFetchingNextPage
                    ? "LOADING..."
                    : "LOAD_MORE"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* SELECTED EXERCISES */}

        {selectedExercises.length > 0 ? (
          <View style={styles.selectedSection}>
            <View style={styles.selectedHeader}>
              <Text style={styles.inputLabel}>SELECTED_EXERCISES</Text>

              <Text style={styles.selectedCount}>
                {String(selectedExercises.length).padStart(2, "0")}
              </Text>
            </View>

            <View style={styles.selectedList}>
              {selectedExercises.map((selectedExercise, index) => {
                const exercise = selectedExercise.exercise;

                return (
                  <View key={exercise._id} style={styles.selectedExerciseCard}>
                    <View style={styles.selectedExerciseHeader}>
                      <View style={styles.selectedIndex}>
                        <Text style={styles.selectedIndexText}>
                          {String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>

                      <View style={styles.selectedExerciseInfo}>
                        <Text style={styles.selectedExerciseName}>
                          {exercise.name}
                        </Text>

                        <Text style={styles.selectedExerciseType}>
                          {exercise.measurementType
                            .replaceAll("_", " ")
                            .toUpperCase()}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleRemoveExercise(exercise._id)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color={Colors.dark.textMuted}
                        />
                      </Pressable>
                    </View>

                    <WorkoutExerciseTarget
                      measurementType={exercise.measurementType}
                      target={selectedExercise.target}
                      onTargetChange={(field, value) =>
                        handleTargetChange(exercise._id, field, value)
                      }
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* CREATE */}

        <View style={styles.saveSection}>
          {createErrorMessage ? (
            <View style={styles.saveErrorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={Colors.dark.danger}
              />

              <Text style={styles.saveErrorText}>{createErrorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleCreateWorkout}
            disabled={createDisabled}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && !createDisabled && styles.saveButtonPressed,
              createDisabled && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {createWorkoutMutation.isPending
                ? "CREATING..."
                : "CREATE_WORKOUT"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 34,
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
    lineHeight: 36,
    fontWeight: "800",
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionNumber: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "800",
  },

  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  form: {
    gap: 20,
  },

  inputLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    color: Colors.dark.text,
    fontSize: 13,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  descriptionInput: {
    minHeight: 90,
    paddingTop: 13,
    paddingBottom: 13,
    textAlignVertical: "top",
  },

  visibilityRow: {
    flexDirection: "row",
    gap: 8,
  },

  visibilityButton: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  visibilityButtonSelected: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderColor: Colors.dark.accent,
  },

  visibilityText: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  visibilityTextSelected: {
    color: Colors.dark.accent,
  },

  exerciseSection: {
    marginTop: 36,
  },

  exerciseSectionDescription: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 14,
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

  exerciseResults: {
    marginTop: 10,
    gap: 6,
  },

  exerciseResult: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  exerciseResultSelected: {
    opacity: 0.5,
    backgroundColor: Colors.dark.backgroundSelected,
  },

  exerciseResultInfo: {
    flex: 1,
    paddingRight: 12,
  },

  exerciseResultName: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "800",
  },

  exerciseResultMetadata: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  addExerciseText: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  addExerciseTextSelected: {
    color: Colors.dark.textDim,
  },

  exerciseStateText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 16,
    textAlign: "center",
  },

  exerciseErrorText: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 16,
    textAlign: "center",
  },

  loadMoreButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  loadMoreButtonPressed: {
    backgroundColor: Colors.dark.backgroundElement,
  },

  loadMoreButtonDisabled: {
    opacity: 0.5,
  },

  loadMoreText: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  selectedSection: {
    marginTop: 26,
  },

  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  selectedCount: {
    color: Colors.dark.accent,
    fontSize: 11,
    fontWeight: "800",
  },

  selectedList: {
    gap: 7,
  },

  selectedExerciseCard: {
    padding: 14,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  selectedExerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  selectedIndex: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  selectedIndexText: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "800",
  },

  selectedExerciseInfo: {
    flex: 1,
  },

  selectedExerciseName: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "800",
  },

  selectedExerciseType: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 3,
  },

  saveSection: {
    marginTop: 30,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  saveErrorContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
  },

  saveErrorText: {
    flex: 1,
    color: Colors.dark.danger,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
  },

  saveButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
  },

  saveButtonPressed: {
    backgroundColor: Colors.dark.accentPressed,
  },

  saveButtonDisabled: {
    opacity: 0.4,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
});
