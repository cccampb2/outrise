import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type {
  ActualSetInput,
  WorkoutSessionExercise,
} from "@/api/workout-sessions";
import { Colors, Fonts } from "@/constants/theme";

type RepsExerciseProps = {
  exercise: WorkoutSessionExercise;
  onSave: (sets: ActualSetInput[]) => Promise<void>;
  isSaving: boolean;
  errorMessage?: string;
};

type EditableSet = {
  order: number;
  reps: string;
  isSaved: boolean;
  isEditing: boolean;
};

function createBlankSet(): EditableSet {
  return {
    order: 0,
    reps: "",
    isSaved: false,
    isEditing: true,
  };
}

function createEditableSets(exercise: WorkoutSessionExercise): EditableSet[] {
  const savedSets = exercise.actual.sets ?? [];

  if (savedSets.length === 0) {
    return [createBlankSet()];
  }

  return savedSets.map((set) => ({
    order: set.order,
    reps: String(set.reps ?? ""),
    isSaved: true,
    isEditing: false,
  }));
}

function reindexSets(sets: EditableSet[]): EditableSet[] {
  return sets.map((set, index) => ({
    ...set,
    order: index,
  }));
}

export function RepsExercise({
  exercise,
  onSave,
  isSaving,
  errorMessage,
}: RepsExerciseProps) {
  const [sets, setSets] = useState<EditableSet[]>(() =>
    createEditableSets(exercise),
  );

  const [previousSets, setPreviousSets] = useState(exercise.actual.sets);
  if (previousSets !== exercise.actual.sets) {
    setPreviousSets(exercise.actual.sets);
    setSets(createEditableSets(exercise));
  }

  const hasUnsavedSet = sets.some((set) => !set.isSaved);

  function addSet() {
    setSets((currentSets) => [
      ...currentSets,
      {
        order: currentSets.length,
        reps: "",
        isSaved: false,
        isEditing: true,
      },
    ]);
  }

  function editSet(order: number) {
    setSets((currentSets) =>
      currentSets.map((set) =>
        set.order === order
          ? {
              ...set,
              isEditing: true,
            }
          : set,
      ),
    );
  }

  function updateSetReps(order: number, value: string) {
    setSets((currentSets) =>
      currentSets.map((set) =>
        set.order === order
          ? {
              ...set,
              reps: value,
            }
          : set,
      ),
    );
  }

  async function saveSet(order: number) {
    const setToSave = sets.find((set) => set.order === order);

    if (!setToSave) {
      return;
    }

    const repsNumber = Number(setToSave.reps);

    const isValid =
      setToSave.reps.trim() !== "" &&
      Number.isFinite(repsNumber) &&
      repsNumber > 0;

    if (!isValid) {
      return;
    }

    const setsToSave: ActualSetInput[] = sets
      .filter((set) => set.isSaved || set.order === order)
      .map((set) => ({
        order: set.order,
        reps: Number(set.reps),
      }));

    try {
      await onSave(setsToSave);

      setSets((currentSets) =>
        currentSets.map((set) =>
          set.order === order
            ? {
                ...set,
                isSaved: true,
                isEditing: false,
              }
            : set,
        ),
      );
    } catch {
      // Parent displays mutation error.
    }
  }

  async function deleteSet(order: number) {
    const setToDelete = sets.find((set) => set.order === order);

    if (!setToDelete) {
      return;
    }

    const remainingSets = reindexSets(
      sets.filter((set) => set.order !== order),
    );

    if (!setToDelete.isSaved) {
      setSets(remainingSets.length > 0 ? remainingSets : [createBlankSet()]);
      return;
    }

    const savedSetsToPersist: ActualSetInput[] = remainingSets
      .filter((set) => set.isSaved)
      .map((set, index) => ({
        order: index,
        reps: Number(set.reps),
      }));

    try {
      await onSave(savedSetsToPersist);

      setSets(remainingSets.length > 0 ? remainingSets : [createBlankSet()]);
    } catch {
      // Parent displays mutation error.
    }
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>PERFORMANCE_SETS_</Text>

      {sets.map((set) => {
        const repsNumber = Number(set.reps);

        const canSave =
          set.reps.trim() !== "" &&
          Number.isFinite(repsNumber) &&
          repsNumber > 0;

        const showInputs = !set.isSaved || set.isEditing;

        return (
          <View key={set.order} style={styles.setRow}>
            <View style={styles.setIdentifier}>
              <Text style={styles.setIndex}>
                {String(set.order + 1).padStart(2, "0")}
              </Text>
              <Text style={styles.setLabel}>SET</Text>
            </View>

            {showInputs ? (
              <View style={styles.setInputs}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={set.reps}
                    onChangeText={(value) => updateSetReps(set.order, value)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.dark.textDim}
                  />
                  <Text style={styles.unitText}>REPS</Text>
                </View>

                <Pressable
                  style={[
                    styles.checkButton,
                    (!canSave || isSaving) && styles.checkButtonDisabled,
                  ]}
                  disabled={!canSave || isSaving}
                  onPress={() => saveSet(set.order)}
                >
                  <Text style={styles.checkText}>✓</Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  disabled={isSaving}
                  onPress={() => deleteSet(set.order)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.completedSet,
                  pressed && styles.completedSetPressed,
                ]}
                onPress={() => editSet(set.order)}
              >
                <View style={styles.completedIndicator} />

                <Text style={styles.completedSetText}>{set.reps} REPS</Text>

                <Text style={styles.completedCheck}>✓</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Pressable
        style={[
          styles.addSetButton,
          hasUnsavedSet && styles.addSetButtonDisabled,
        ]}
        disabled={hasUnsavedSet}
        onPress={addSet}
      >
        <Text style={styles.addSetText}>+ ADD_SET</Text>
      </Pressable>

      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  setIdentifier: {
    width: 42,
    alignItems: "center",
  },

  setIndex: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: "800",
  },

  setLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 1,
  },

  setInputs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  inputContainer: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  input: {
    fontFamily: Fonts.display,
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700",
  },

  unitText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginRight: 10,
  },

  checkButton: {
    width: 46,
    height: 48,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  checkButtonDisabled: {
    opacity: 0.25,
  },

  checkText: {
    color: Colors.dark.backgroundDeep,
    fontSize: 17,
    fontWeight: "900",
  },

  deleteButton: {
    width: 34,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    fontFamily: Fonts.display,
    color: Colors.dark.danger,
    fontSize: 21,
    fontWeight: "700",
  },

  completedSet: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    overflow: "hidden",
  },

  completedSetPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
  },

  completedIndicator: {
    alignSelf: "stretch",
    width: 3,
    backgroundColor: Colors.dark.accent,
  },

  completedSetText: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 12,
  },

  completedCheck: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "800",
    marginRight: 14,
  },

  addSetButton: {
    alignSelf: "flex-start",
    marginLeft: 52,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },

  addSetButtonDisabled: {
    opacity: 0.25,
  },

  addSetText: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  errorText: {
    color: Colors.dark.danger,
    fontSize: 11,
    marginTop: 8,
  },
});
