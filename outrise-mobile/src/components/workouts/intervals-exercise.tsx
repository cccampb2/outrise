import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { WorkoutSessionExercise } from "@/api/workout-sessions";
import { Colors, Fonts } from "@/constants/theme";

type IntervalExerciseProps = {
  exercise: WorkoutSessionExercise;
  onSave: (roundsCompleted: number) => Promise<void>;
  isSaving: boolean;
  errorMessage?: string;
};

export function IntervalExercise({
  exercise,
  onSave,
  isSaving,
  errorMessage,
}: IntervalExerciseProps) {
  const savedRounds = exercise.actual.roundsCompleted ?? null;

  const [roundsCompleted, setRoundsCompleted] = useState(
    savedRounds !== null ? String(savedRounds) : "",
  );

  const [isEditing, setIsEditing] = useState(savedRounds === null);

  useEffect(() => {
    const serverRounds = exercise.actual.roundsCompleted ?? null;

    if (serverRounds === null) {
      setRoundsCompleted("");
      setIsEditing(true);
      return;
    }

    setRoundsCompleted(String(serverRounds));
    setIsEditing(false);
  }, [exercise.actual.roundsCompleted]);

  const roundsNumber = Number(roundsCompleted);

  const canSave =
    roundsCompleted.trim() !== "" &&
    Number.isInteger(roundsNumber) &&
    roundsNumber > 0;

  async function saveRounds() {
    if (!canSave) {
      return;
    }

    try {
      await onSave(roundsNumber);
      setIsEditing(false);
    } catch {
      // Parent displays mutation error.
    }
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>INTERVAL_PROTOCOL_</Text>

      <View style={styles.targetCard}>
        <View style={styles.targetItem}>
          <Text style={styles.targetIndex}>01</Text>
          <Text style={styles.targetValue}>
            {exercise.target.workSeconds ?? "—"}
          </Text>
          <Text style={styles.targetLabel}>WORK_SEC</Text>
        </View>

        <View style={styles.targetDivider} />

        <View style={styles.targetItem}>
          <Text style={styles.targetIndex}>02</Text>
          <Text style={styles.targetValue}>
            {exercise.target.recoverySeconds ?? "—"}
          </Text>
          <Text style={styles.targetLabel}>RECOVERY_SEC</Text>
        </View>
      </View>

      {isEditing ? (
        <View>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={roundsCompleted}
              onChangeText={setRoundsCompleted}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.dark.textDim}
            />

            <Text style={styles.inputLabel}>ROUNDS_COMPLETED</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (!canSave || isSaving) && styles.saveButtonDisabled,
              pressed && canSave && !isSaving && styles.saveButtonPressed,
            ]}
            disabled={!canSave || isSaving}
            onPress={saveRounds}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? "SAVING..." : "SAVE_ROUNDS // ✓"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.completedRounds,
            pressed && styles.completedPressed,
          ]}
          onPress={() => setIsEditing(true)}
        >
          <View style={styles.completedIndicator} />

          <View style={styles.completedContent}>
            <Text style={styles.completedLabel}>ROUNDS_COMPLETED</Text>
            <Text style={styles.completedValue}>{roundsCompleted}</Text>
          </View>

          <Text style={styles.completedCheck}>✓</Text>
        </Pressable>
      )}

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
    marginBottom: 10,
  },

  targetCard: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 22,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  targetItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },

  targetIndex: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
    marginBottom: 3,
  },

  targetValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 19,
    fontWeight: "800",
  },

  targetLabel: {
    marginTop: 4,
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  targetDivider: {
    width: 1,
    backgroundColor: Colors.dark.border,
  },

  inputGroup: {
    alignItems: "center",
    gap: 7,
  },

  input: {
    fontFamily: Fonts.display,
    width: 120,
    height: 54,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    borderRadius: 2,
    paddingHorizontal: 12,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  inputLabel: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  saveButton: {
    marginTop: 20,
    minHeight: 48,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.25,
  },

  saveButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  saveButtonText: {
    color: Colors.dark.backgroundDeep,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  completedRounds: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    overflow: "hidden",
  },

  completedPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
  },

  completedIndicator: {
    alignSelf: "stretch",
    width: 3,
    backgroundColor: Colors.dark.accent,
  },

  completedContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  completedLabel: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  completedValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: "800",
  },

  completedCheck: {
    color: Colors.dark.accent,
    fontSize: 18,
    fontWeight: "800",
    marginRight: 16,
  },

  errorText: {
    color: Colors.dark.danger,
    fontSize: 11,
    marginTop: 8,
  },
});
