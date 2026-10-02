import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { WorkoutSessionExercise } from "@/api/workout-sessions";
import { Colors } from "@/constants/theme";

type DistanceTimeExerciseProps = {
  exercise: WorkoutSessionExercise;
  onSave: (distanceMiles: number, timeSeconds: number) => Promise<void>;
  isSaving: boolean;
  errorMessage?: string;
};

function getMinutes(totalSeconds: number) {
  return Math.floor(totalSeconds / 60);
}

function getSeconds(totalSeconds: number) {
  return totalSeconds % 60;
}

export function DistanceTimeExercise({
  exercise,
  onSave,
  isSaving,
  errorMessage,
}: DistanceTimeExerciseProps) {
  const savedDistance = exercise.actual.distanceMiles ?? null;
  const savedTime = exercise.actual.timeSeconds ?? null;

  const hasSavedPerformance = savedDistance !== null && savedTime !== null;

  const [distance, setDistance] = useState(
    savedDistance !== null ? String(savedDistance) : "",
  );

  const [minutes, setMinutes] = useState(
    savedTime !== null ? String(getMinutes(savedTime)) : "",
  );

  const [seconds, setSeconds] = useState(
    savedTime !== null ? String(getSeconds(savedTime)) : "",
  );

  const [isEditing, setIsEditing] = useState(!hasSavedPerformance);

  useEffect(() => {
    const serverDistance = exercise.actual.distanceMiles ?? null;
    const serverTime = exercise.actual.timeSeconds ?? null;

    if (serverDistance === null || serverTime === null) {
      setDistance("");
      setMinutes("");
      setSeconds("");
      setIsEditing(true);
      return;
    }

    setDistance(String(serverDistance));
    setMinutes(String(getMinutes(serverTime)));
    setSeconds(String(getSeconds(serverTime)));
    setIsEditing(false);
  }, [exercise.actual.distanceMiles, exercise.actual.timeSeconds]);

  const distanceNumber = Number(distance);
  const minutesNumber = Number(minutes.trim() || "0");
  const secondsNumber = Number(seconds.trim() || "0");

  const canSave =
    distance.trim() !== "" &&
    Number.isFinite(distanceNumber) &&
    Number.isInteger(minutesNumber) &&
    Number.isInteger(secondsNumber) &&
    distanceNumber > 0 &&
    minutesNumber >= 0 &&
    secondsNumber >= 0 &&
    secondsNumber <= 59 &&
    minutesNumber * 60 + secondsNumber > 0;

  async function savePerformance() {
    if (!canSave) {
      return;
    }

    const totalSeconds = minutesNumber * 60 + secondsNumber;

    try {
      await onSave(distanceNumber, totalSeconds);
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
          <Text style={styles.sectionLabel}>DISTANCE_</Text>

          <View style={styles.distanceRow}>
            <TextInput
              style={styles.distanceInput}
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.dark.textDim}
            />

            <Text style={styles.unitText}>MILES</Text>
          </View>

          <Text style={styles.sectionLabel}>TIME_</Text>

          <View style={styles.timeInputs}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.timeInput}
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
                style={styles.timeInput}
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
            onPress={savePerformance}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? "SAVING..." : "SAVE_PERFORMANCE // ✓"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.completedPerformance,
            pressed && styles.completedPressed,
          ]}
          onPress={() => setIsEditing(true)}
        >
          <View style={styles.completedIndicator} />

          <View style={styles.completedContent}>
            <Text style={styles.completedLabel}>RECORDED_PERFORMANCE</Text>

            <Text style={styles.completedValue}>
              {distance} MI // {minutes}:{seconds.padStart(2, "0")}
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
    marginBottom: 8,
  },

  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },

  distanceInput: {
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

  unitText: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  inputGroup: {
    alignItems: "center",
    gap: 6,
  },

  timeInput: {
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

  completedPerformance: {
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
    color: Colors.dark.text,
    fontSize: 18,
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
