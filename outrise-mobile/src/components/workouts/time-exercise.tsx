import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { WorkoutSessionExercise } from "@/api/workout-sessions";
import { Colors, Fonts } from "@/constants/theme";

type TimeExerciseProps = {
  exercise: WorkoutSessionExercise;
  onSave: (timeSeconds: number) => Promise<void>;
  isSaving: boolean;
  errorMessage?: string;
};

function getMinutes(totalSeconds: number) {
  return Math.floor(totalSeconds / 60);
}

function getSeconds(totalSeconds: number) {
  return totalSeconds % 60;
}

export function TimeExercise({
  exercise,
  onSave,
  isSaving,
  errorMessage,
}: TimeExerciseProps) {
  const savedTime = exercise.actual.timeSeconds ?? null;

  const [minutes, setMinutes] = useState(
    savedTime !== null ? String(getMinutes(savedTime)) : "",
  );

  const [seconds, setSeconds] = useState(
    savedTime !== null ? String(getSeconds(savedTime)) : "",
  );

  const [isEditing, setIsEditing] = useState(savedTime === null);

  const [previousTime, setPreviousTime] = useState(savedTime);
  if (previousTime !== savedTime) {
    setPreviousTime(savedTime);
    setMinutes(savedTime === null ? "" : String(getMinutes(savedTime)));
    setSeconds(savedTime === null ? "" : String(getSeconds(savedTime)));
    setIsEditing(savedTime === null);
  }

  const minutesNumber = Number(minutes.trim() || "0");
  const secondsNumber = Number(seconds.trim() || "0");

  const canSave =
    Number.isInteger(minutesNumber) &&
    Number.isInteger(secondsNumber) &&
    minutesNumber >= 0 &&
    secondsNumber >= 0 &&
    secondsNumber <= 59 &&
    minutesNumber * 60 + secondsNumber > 0;

  async function saveTime() {
    if (!canSave) {
      return;
    }

    const totalSeconds = minutesNumber * 60 + secondsNumber;

    try {
      await onSave(totalSeconds);
      setMinutes(String(minutesNumber));
      setSeconds(String(secondsNumber));
      setIsEditing(false);
    } catch {
      // Parent displays mutation error.
    }
  }

  return (
    <View>
      {isEditing ? (
        <View>
          <Text style={styles.sectionLabel}>RECORDED_TIME_</Text>

          <View style={styles.timeInputs}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor={Colors.dark.textDim}
              />

              <Text style={styles.inputLabel}>MIN</Text>
            </View>

            <Text style={styles.colon}>:</Text>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={seconds}
                onChangeText={setSeconds}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor={Colors.dark.textDim}
              />

              <Text style={styles.inputLabel}>SEC</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (!canSave || isSaving) && styles.saveButtonDisabled,
              pressed && canSave && !isSaving && styles.saveButtonPressed,
            ]}
            disabled={!canSave || isSaving}
            onPress={saveTime}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? "SAVING..." : "SAVE_TIME // ✓"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.completedTime,
            pressed && styles.completedPressed,
          ]}
          onPress={() => setIsEditing(true)}
        >
          <View style={styles.completedIndicator} />

          <View style={styles.completedContent}>
            <Text style={styles.completedLabel}>RECORDED_TIME</Text>

            <Text style={styles.completedValue}>
              {minutes}:{seconds.padStart(2, "0")}
            </Text>
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
    marginBottom: 12,
  },

  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  inputGroup: {
    alignItems: "center",
    gap: 6,
  },

  input: {
    fontFamily: Fonts.display,
    width: 90,
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

  colon: {
    fontFamily: Fonts.display,
    color: Colors.dark.accent,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 18,
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

  completedTime: {
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
    marginBottom: 5,
  },

  completedValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 21,
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
