import { BrandHeader } from "@/components/brand-header";
import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/components/screen";
import { WorkoutExerciseTarget } from "@/components/workouts/workout-exercise-target";
import { Colors, Fonts } from "@/constants/theme";
import {
  getWorkoutById,
  updateWorkout,
  type UpdateWorkoutInput,
  type WorkoutVisibility,
} from "@/api/workouts";
import { getExercises, type Exercise } from "@/api/exercises";
import type { WorkoutTarget } from "@/api/workout-sessions";
import { ApiError } from "@/api/client";

type SelectedExercise = {
  exercise: Exercise;
  target: WorkoutTarget;
};

export default function EditWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{
    workoutId: string;
  }>();

  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [visibility, setVisibility] = useState<WorkoutVisibility>("private");

  const [exerciseSearch, setExerciseSearch] = useState("");

  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);

  const [formError, setFormError] = useState<string | null>(null);

  const [formInitialized, setFormInitialized] = useState(false);

  const workoutQuery = useQuery({
    queryKey: ["workout", workoutId],

    queryFn: () => getWorkoutById(workoutId),

    enabled: !!workoutId,
  });

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

  if (workoutQuery.data && !formInitialized) {
    const workout = workoutQuery.data.workout;

    setName(workout.name);

    setDescription(workout.description ?? "");

    setVisibility(workout.visibility);

    setSelectedExercises(
      workout.exercises.map((workoutExercise) => ({
        exercise: workoutExercise.exercise,
        target: workoutExercise.target,
      })),
    );

    setFormInitialized(true);
  }

  const updateWorkoutMutation = useMutation({
    mutationFn: (input: UpdateWorkoutInput) => updateWorkout(workoutId, input),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["workout", workoutId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["workouts"],
        }),
      ]);

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

  function validateTargets() {
    for (const selectedExercise of selectedExercises) {
      const { exercise, target } = selectedExercise;

      if (
        exercise.measurementType === "weight_reps" ||
        exercise.measurementType === "reps"
      ) {
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

  function handleSave() {
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setFormError("Enter a workout name.");
      return;
    }

    if (selectedExercises.length === 0) {
      setFormError("Add at least one exercise.");
      return;
    }

    const targetError = validateTargets();

    if (targetError) {
      setFormError(targetError);
      return;
    }

    const input: UpdateWorkoutInput = {
      name: trimmedName,

      // Description is optional.
      // Sending "" allows an existing description to be cleared.
      description: trimmedDescription || "",

      visibility,

      exercises: selectedExercises.map((selectedExercise, index) => ({
        exercise: selectedExercise.exercise._id,
        order: index,
        target: selectedExercise.target,
      })),
    };

    updateWorkoutMutation.mutate(input);
  }

  function getSaveErrorMessage() {
    if (formError) {
      return formError;
    }

    if (!updateWorkoutMutation.isError) {
      return null;
    }

    if (updateWorkoutMutation.error instanceof ApiError) {
      return updateWorkoutMutation.error.getDisplayMessage();
    }

    return "Unable to update workout.";
  }

  const saveErrorMessage = getSaveErrorMessage();

  const saveDisabled =
    updateWorkoutMutation.isPending ||
    name.trim().length === 0 ||
    selectedExercises.length === 0;

  if (workoutQuery.isPending) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <ActivityIndicator color={Colors.dark.accent} />

          <Text style={styles.stateText}>LOADING_WORKOUT</Text>
        </View>
      </Screen>
    );
  }

  if (workoutQuery.isError) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.errorCode}>SYSTEM_ERROR</Text>

          <Text style={styles.stateText}>Unable to load workout.</Text>

          <Pressable
            onPress={() => workoutQuery.refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <BrandHeader label="TRAINING" style={styles.brandLabelLayout} />

        <Text style={styles.title}>EDIT_WORKOUT</Text>

        <Text style={styles.subtitle}>
          Modify your saved workout prescription.
        </Text>
      </View>

      {/* DETAILS */}

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
            placeholder="Workout name"
            placeholderTextColor={Colors.dark.textDim}
            maxLength={100}
            style={styles.input}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>DESCRIPTION // OPTIONAL</Text>

          <TextInput
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              setFormError(null);
            }}
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
              onPress={() => {
                setVisibility("private");
                setFormError(null);
              }}
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
              onPress={() => {
                setVisibility("public");
                setFormError(null);
              }}
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
          Add, remove, or change targets in this workout.
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
                      {exercise.category.toUpperCase()}{" // "}
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

        {/* SELECTED */}

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

        {/* SAVE */}

        <View style={styles.saveSection}>
          {saveErrorMessage ? (
            <View style={styles.saveErrorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={Colors.dark.danger}
              />

              <Text style={styles.saveErrorText}>{saveErrorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && !saveDisabled && styles.saveButtonPressed,
              saveDisabled && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {updateWorkoutMutation.isPending ? "SAVING..." : "SAVE_CHANGES"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 10,
  },

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stateText: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
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

  title: {
    fontFamily: Fonts.display,
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
