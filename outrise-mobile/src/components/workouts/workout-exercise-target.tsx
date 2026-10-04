import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";
import type { MeasurementType, WorkoutTarget } from "@/api/workout-sessions";

type WorkoutExerciseTargetProps = {
  measurementType: MeasurementType;
  target: WorkoutTarget;
  onTargetChange: (
    field: keyof WorkoutTarget,
    value: number | undefined,
  ) => void;
};

type TargetInputProps = {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  decimal?: boolean;
};

type TimeTargetInputProps = {
  value: number | undefined;
  onChange: (totalSeconds: number | undefined) => void;
};

function TargetInput({
  label,
  value,
  onChange,
  decimal = false,
}: TargetInputProps) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [previousValue, setPreviousValue] = useState(value);

  if (previousValue !== value) {
    setPreviousValue(value);
    // Keep an unfinished decimal (such as "1.") during normal typing.
    if ((text === "" || text === "." ? undefined : Number(text)) !== value) {
      setText(value === undefined ? "" : String(value));
    }
  }

  function handleChange(nextText: string) {
    if (!(decimal ? /^\d*(?:\.\d*)?$/ : /^\d*$/).test(nextText)) return;
    setText(nextText);
    onChange(nextText === "" || nextText === "." ? undefined : Number(nextText));
  }

  return (
    <View style={styles.targetInputContainer}>
      <Text style={styles.targetInputLabel}>{label}</Text>

      <TextInput
        value={text}
        onChangeText={handleChange}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        placeholder="0"
        placeholderTextColor={Colors.dark.textDim}
        style={styles.targetInput}
      />
    </View>
  );
}

function TimeTargetInput({ value, onChange }: TimeTargetInputProps) {
  const initialTotalSeconds = value ?? 0;

  const [minutesText, setMinutesText] = useState(
    String(Math.floor(initialTotalSeconds / 60)),
  );

  const [secondsText, setSecondsText] = useState(
    String(initialTotalSeconds % 60),
  );

  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    const totalSeconds = value ?? 0;
    // Parent updates caused by this input should not overwrite its drafts.
    if (Number(minutesText || "0") * 60 + Number(secondsText || "0") !== totalSeconds) {
      setMinutesText(String(Math.floor(totalSeconds / 60)));
      setSecondsText(String(totalSeconds % 60));
    }
  }

  function updateTotalSeconds(
    nextMinutesText: string,
    nextSecondsText: string,
  ) {
    const minutes = nextMinutesText === "" ? 0 : Number(nextMinutesText);

    const seconds = nextSecondsText === "" ? 0 : Number(nextSecondsText);

    const totalSeconds = minutes * 60 + seconds;

    onChange(totalSeconds === 0 ? undefined : totalSeconds);
  }

  function handleMinutesChange(text: string) {
    const numbersOnly = text.replace(/[^0-9]/g, "");

    setMinutesText(numbersOnly);

    updateTotalSeconds(numbersOnly, secondsText);
  }

  function handleSecondsChange(text: string) {
    const numbersOnly = text.replace(/[^0-9]/g, "");

    if (numbersOnly !== "" && Number(numbersOnly) > 59) {
      return;
    }

    setSecondsText(numbersOnly);

    updateTotalSeconds(minutesText, numbersOnly);
  }

  function handleMinutesBlur() {
    if (minutesText === "") {
      setMinutesText("0");
    }
  }

  function handleSecondsBlur() {
    if (secondsText === "") {
      setSecondsText("0");
    }
  }

  return (
    <>
      <View style={styles.targetInputContainer}>
        <Text style={styles.targetInputLabel}>MIN</Text>

        <TextInput
          value={minutesText}
          onChangeText={handleMinutesChange}
          onBlur={handleMinutesBlur}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={3}
          style={styles.targetInput}
        />
      </View>

      <View style={styles.targetInputContainer}>
        <Text style={styles.targetInputLabel}>SEC</Text>

        <TextInput
          value={secondsText}
          onChangeText={handleSecondsChange}
          onBlur={handleSecondsBlur}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={2}
          style={styles.targetInput}
        />
      </View>
    </>
  );
}

export function WorkoutExerciseTarget({
  measurementType,
  target,
  onTargetChange,
}: WorkoutExerciseTargetProps) {
  return (
    <View style={styles.targetSection}>
      <View style={styles.targetPrompt}>
        <Text style={styles.targetPromptLabel}>TARGET_GOAL</Text>

        <Text style={styles.targetPromptText}>
          What are you aiming for? Set the target for this exercise.
        </Text>
      </View>

      <View style={styles.targetInputs}>
        {measurementType === "weight_reps" ? (
          <>
            <TargetInput
              label="SETS"
              value={target.sets}
              onChange={(value) => onTargetChange("sets", value)}
            />

            <TargetInput
              label="REPS"
              value={target.reps}
              onChange={(value) => onTargetChange("reps", value)}
            />

            <TargetInput
              label="WEIGHT_LB"
              value={target.weightLbs}
              onChange={(value) => onTargetChange("weightLbs", value)}
              decimal
            />
          </>
        ) : null}

        {measurementType === "reps" ? (
          <>
            <TargetInput
              label="SETS"
              value={target.sets}
              onChange={(value) => onTargetChange("sets", value)}
            />

            <TargetInput
              label="REPS"
              value={target.reps}
              onChange={(value) => onTargetChange("reps", value)}
            />
          </>
        ) : null}

        {measurementType === "distance_time" ? (
          <>
            <TargetInput
              label="DISTANCE_MI"
              value={target.distanceMiles}
              onChange={(value) => onTargetChange("distanceMiles", value)}
              decimal
            />

            <TimeTargetInput
              value={target.timeSeconds}
              onChange={(value) => onTargetChange("timeSeconds", value)}
            />
          </>
        ) : null}

        {measurementType === "time" || measurementType === "duration" ? (
          <TimeTargetInput
            value={target.timeSeconds}
            onChange={(value) => onTargetChange("timeSeconds", value)}
          />
        ) : null}

        {measurementType === "intervals" ? (
          <>
            <TargetInput
              label="WORK_SEC"
              value={target.workSeconds}
              onChange={(value) => onTargetChange("workSeconds", value)}
            />

            <TargetInput
              label="RECOVERY_SEC"
              value={target.recoverySeconds}
              onChange={(value) => onTargetChange("recoverySeconds", value)}
            />

            <TargetInput
              label="ROUNDS"
              value={target.rounds}
              onChange={(value) => onTargetChange("rounds", value)}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  targetSection: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  targetPrompt: {
    marginBottom: 12,
  },

  targetPromptLabel: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  targetPromptText: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  targetInputs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  targetInputContainer: {
    flexGrow: 1,
    flexBasis: 90,
  },

  targetInputLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },

  targetInput: {
    height: 42,
    paddingHorizontal: 11,
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
});
