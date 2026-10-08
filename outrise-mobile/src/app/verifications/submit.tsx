import { BrandHeader } from "@/components/brand-header";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { getExercises, type Exercise } from "@/api/exercises";
import {
  createVerification,
  type VerificationPerformance,
  type VerificationVideo,
} from "@/api/verifications";
import { ApiError } from "@/api/client";

function formatMeasurementType(measurementType: Exercise["measurementType"]) {
  switch (measurementType) {
    case "weight_reps":
      return "WEIGHT + REPS";

    case "reps":
      return "REPS";

    case "time":
      return "TIME";

    case "distance_time":
      return "DISTANCE + TIME";

    case "duration":
      return "DURATION";

    case "intervals":
      return "INTERVALS";

    default:
      return measurementType;
  }
}

function getVideoName(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileName) {
    return asset.fileName;
  }

  const extension = asset.mimeType === "video/quicktime" ? "mov" : "mp4";

  return `verification-${Date.now()}.${extension}`;
}

function getVideoMimeType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  if (asset.uri.toLowerCase().endsWith(".mov")) {
    return "video/quicktime";
  }

  return "video/mp4";
}

export default function SubmitVerificationScreen() {
  const queryClient = useQueryClient();
  const submissionAttempt = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );

  const [reps, setReps] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");

  const [video, setVideo] = useState<VerificationVideo | null>(null);

  const exercisesQuery = useQuery({
    queryKey: ["verification-exercises", search],
    queryFn: () =>
      getExercises({
        page: 1,
        limit: 20,
        search: search.trim() || undefined,
      }),
  });

  const eligibleExercises = useMemo(() => {
    return (
      exercisesQuery.data?.exercises.filter(
        (exercise) =>
          exercise.isActive && exercise.measurementType !== "intervals",
      ) ?? []
    );
  }, [exercisesQuery.data]);

  const createVerificationMutation = useMutation({
    mutationFn: createVerification,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["verifications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-verifications"] }),
      ]);
      Alert.alert(
        "Verification Submitted",
        "Your performance was submitted for review.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status < 500) {
        Alert.alert("Submission Failed", error.getDisplayMessage());

        return;
      }
      console.error("VERIFICATION SUBMISSION ERROR:", error);
      Alert.alert(
        "Submission Not Confirmed",
        "Your submission may already be saved. Retry with the same details when connected.",
      );
    },
  });

  function selectExercise(exercise: Exercise) {
    if (createVerificationMutation.isPending) return;
    setSelectedExercise(exercise);

    setReps("");
    setWeightLbs("");
    setDistanceMiles("");
    setTimeSeconds("");
  }

  async function chooseVideo() {
    if (createVerificationMutation.isPending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Outrise needs access to your media library to select a verification video.",
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    setVideo({
      uri: asset.uri,
      name: getVideoName(asset),
      type: getVideoMimeType(asset),
    });
  }

  async function recordVideo() {
    if (createVerificationMutation.isPending) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Outrise needs camera access to record a verification video.",
      );

      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 120,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    setVideo({
      uri: asset.uri,
      name: getVideoName(asset),
      type: getVideoMimeType(asset),
    });
  }

  function buildPerformance(): VerificationPerformance | null {
    if (!selectedExercise) {
      return null;
    }

    switch (selectedExercise.measurementType) {
      case "weight_reps": {
        const parsedReps = Number(reps);
        const parsedWeight = Number(weightLbs);

        if (
          !Number.isInteger(parsedReps) ||
          parsedReps <= 0 ||
          !Number.isFinite(parsedWeight) ||
          parsedWeight <= 0
        ) {
          return null;
        }

        return {
          reps: parsedReps,
          weightLbs: parsedWeight,
        };
      }

      case "reps": {
        const parsedReps = Number(reps);

        if (!Number.isInteger(parsedReps) || parsedReps <= 0) {
          return null;
        }

        return {
          reps: parsedReps,
        };
      }

      case "time":
      case "duration": {
        const parsedTime = Number(timeSeconds);

        if (!Number.isFinite(parsedTime) || parsedTime <= 0) {
          return null;
        }

        return {
          timeSeconds: parsedTime,
        };
      }

      case "distance_time": {
        const parsedDistance = Number(distanceMiles);
        const parsedTime = Number(timeSeconds);

        if (
          !Number.isFinite(parsedDistance) ||
          parsedDistance <= 0 ||
          !Number.isFinite(parsedTime) ||
          parsedTime <= 0
        ) {
          return null;
        }

        return {
          distanceMiles: parsedDistance,
          timeSeconds: parsedTime,
        };
      }

      case "intervals":
        return null;
    }
  }

  function submitVerification() {
    if (createVerificationMutation.isPending) return;
    if (!selectedExercise) {
      Alert.alert("Exercise Required", "Select an exercise to verify.");

      return;
    }

    const performance = buildPerformance();

    if (!performance) {
      Alert.alert("Performance Required", "Enter a valid performance.");

      return;
    }

    if (!video) {
      Alert.alert(
        "Video Required",
        "Record or choose a proof video before submitting.",
      );

      return;
    }

    const fingerprint = JSON.stringify({
      exerciseId: selectedExercise._id,
      performance,
      video: video.uri,
    });
    if (submissionAttempt.current?.fingerprint !== fingerprint) {
      submissionAttempt.current = {
        fingerprint,
        key: `verification:${Date.now()}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`,
      };
    }
    createVerificationMutation.mutate({
      idempotencyKey: submissionAttempt.current.key,
      exerciseId: selectedExercise._id,
      performance,
      video,
    });
  }

  const measurementType = selectedExercise?.measurementType;

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <View style={styles.header}>
          <BrandHeader label="VERIFICATION" style={styles.brandLabelLayout} />

          <Text style={styles.title}>Submit Verification</Text>

          <Text style={styles.description}>
            Submit a recorded performance for review. Approved submissions
            become part of your verified performance record. Submissions not
            reviewed within 30 days expire and their videos are removed. You can
            submit again if that happens. Reviewed videos are removed 30 days
            after review.
          </Text>
        </View>

        {/* EXERCISE */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>01</Text>

          <View>
            <Text style={styles.sectionLabel}>TARGET_EXERCISE</Text>

            <Text style={styles.sectionTitle}>Exercise</Text>
          </View>
        </View>

        {selectedExercise ? (
          <View style={styles.selectedCard}>
            <View style={styles.selectedInformation}>
              <Text style={styles.selectedLabel}>SELECTED</Text>

              <Text style={styles.selectedName}>
                {selectedExercise.name.toUpperCase()}
              </Text>

              <Text style={styles.selectedType}>
                {formatMeasurementType(selectedExercise.measurementType)}
              </Text>
            </View>

            <Pressable
              disabled={createVerificationMutation.isPending}
              onPress={() => setSelectedExercise(null)}
              style={({ pressed }) => [
                styles.changeButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.changeButtonText}>CHANGE</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="SEARCH_EXERCISES"
              placeholderTextColor={Colors.dark.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />

            <View style={styles.exerciseList}>
              {exercisesQuery.isPending ? (
                <View style={styles.loadingArea}>
                  <ActivityIndicator color={Colors.dark.accent} />

                  <Text style={styles.loadingText}>SEARCHING_DATABASE...</Text>
                </View>
              ) : exercisesQuery.isError ? (
                <Text style={styles.errorText}>
                  {"// ERROR: UNABLE_TO_LOAD_EXERCISES"}
                </Text>
              ) : eligibleExercises.length === 0 ? (
                <Text style={styles.emptyText}>
                  {"// NO_ELIGIBLE_EXERCISES_FOUND"}
                </Text>
              ) : (
                eligibleExercises.map((exercise) => (
                  <Pressable
                    key={exercise._id}
                    onPress={() => selectExercise(exercise)}
                    style={({ pressed }) => [
                      styles.exerciseRow,
                      pressed ? styles.exerciseRowPressed : null,
                    ]}
                  >
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>
                        {exercise.name.toUpperCase()}
                      </Text>

                      <Text style={styles.exerciseMeta}>
                        {`${exercise.category.toUpperCase()} // ${formatMeasurementType(
                          exercise.measurementType,
                        )}`}
                      </Text>
                    </View>

                    <Text style={styles.exerciseArrow}>→</Text>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}

        {/* PERFORMANCE */}

        {selectedExercise ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>02</Text>

              <View>
                <Text style={styles.sectionLabel}>CLAIMED_PERFORMANCE</Text>

                <Text style={styles.sectionTitle}>Performance</Text>
              </View>
            </View>

            <View style={styles.performanceCard}>
              {measurementType === "weight_reps" ? (
                <>
                  <PerformanceInput
                    editable={!createVerificationMutation.isPending}
                    label="WEIGHT_LBS"
                    value={weightLbs}
                    onChangeText={setWeightLbs}
                    placeholder="315"
                    decimal
                  />

                  <PerformanceInput
                    editable={!createVerificationMutation.isPending}
                    label="REPS"
                    value={reps}
                    onChangeText={setReps}
                    placeholder="5"
                  />
                </>
              ) : null}

              {measurementType === "reps" ? (
                <PerformanceInput
                  editable={!createVerificationMutation.isPending}
                  label="REPS"
                  value={reps}
                  onChangeText={setReps}
                  placeholder="20"
                />
              ) : null}

              {measurementType === "time" || measurementType === "duration" ? (
                <PerformanceInput
                  editable={!createVerificationMutation.isPending}
                  label="TIME_SECONDS"
                  value={timeSeconds}
                  onChangeText={setTimeSeconds}
                  placeholder="60"
                  decimal
                />
              ) : null}

              {measurementType === "distance_time" ? (
                <>
                  <PerformanceInput
                    editable={!createVerificationMutation.isPending}
                    label="DISTANCE_MILES"
                    value={distanceMiles}
                    onChangeText={setDistanceMiles}
                    placeholder="1.5"
                    decimal
                  />

                  <PerformanceInput
                    editable={!createVerificationMutation.isPending}
                    label="TIME_SECONDS"
                    value={timeSeconds}
                    onChangeText={setTimeSeconds}
                    placeholder="600"
                    decimal
                  />
                </>
              ) : null}
            </View>

            {/* VIDEO */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>03</Text>

              <View>
                <Text style={styles.sectionLabel}>PROOF_MEDIA</Text>

                <Text style={styles.sectionTitle}>Video Proof</Text>
              </View>
            </View>

            <View style={styles.proofCard}>
              {video ? (
                <View style={styles.videoSelected}>
                  <View style={styles.videoStatusDot} />

                  <View style={styles.videoInfo}>
                    <Text style={styles.videoStatus}>VIDEO_ATTACHED</Text>

                    <Text style={styles.videoName} numberOfLines={1}>
                      {video.name}
                    </Text>
                  </View>

                  <Pressable
                    disabled={createVerificationMutation.isPending}
                    onPress={() => setVideo(null)}
                  >
                    <Text style={styles.removeVideoText}>REMOVE</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.proofDescription}>
                  Record the performance or choose an existing video from your
                  device.
                </Text>
              )}

              <View style={styles.videoActions}>
                <Pressable
                  disabled={createVerificationMutation.isPending}
                  onPress={recordVideo}
                  style={({ pressed }) => [
                    styles.videoButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.videoButtonLabel}>RECORD VIDEO</Text>
                </Pressable>

                <Pressable
                  disabled={createVerificationMutation.isPending}
                  onPress={chooseVideo}
                  style={({ pressed }) => [
                    styles.videoButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.videoButtonLabel}>
                    CHOOSE FROM LIBRARY
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* SUBMIT */}

            <View style={styles.submitArea}>
              <Text style={styles.submitNotice}>
                {"// SUBMISSIONS ARE REVIEWED BEFORE APPROVAL"}
              </Text>

              <Pressable
                disabled={createVerificationMutation.isPending}
                onPress={submitVerification}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed ? styles.submitButtonPressed : null,
                  createVerificationMutation.isPending
                    ? styles.submitButtonDisabled
                    : null,
                ]}
              >
                {createVerificationMutation.isPending ? (
                  <ActivityIndicator color={Colors.dark.background} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    SUBMIT VERIFICATION
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

type PerformanceInputProps = {
  editable?: boolean;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  decimal?: boolean;
};

function PerformanceInput({
  editable = true,
  label,
  value,
  onChangeText,
  placeholder,
  decimal = false,
}: PerformanceInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        editable={editable}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.textDim}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        style={styles.performanceInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 7,
  },

  page: {
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 20,
    marginBottom: 8,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  header: {
    marginBottom: 30,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    maxWidth: 330,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 12,
    marginBottom: 11,
  },

  sectionNumber: {
    fontFamily: Fonts.display,
    color: Colors.dark.borderStrong,
    fontSize: 22,
    fontWeight: "900",
  },

  sectionLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 1,
  },

  searchInput: {
    height: 48,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    paddingHorizontal: 14,
    fontSize: 12,

    marginBottom: 8,
  },

  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
    marginBottom: 24,
  },

  exerciseRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },

  exerciseRowPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "800",
  },

  exerciseMeta: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 5,
  },

  exerciseArrow: {
    color: Colors.dark.accent,
    fontSize: 14,
    fontWeight: "900",
  },

  loadingArea: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 10,
  },

  loadingText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  errorText: {
    color: Colors.dark.danger,
    fontSize: 10,
    paddingVertical: 24,
  },

  emptyText: {
    color: Colors.dark.textDim,
    fontSize: 10,
    paddingVertical: 24,
  },

  selectedCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    paddingHorizontal: 15,
    marginBottom: 24,
  },

  selectedInformation: {
    flex: 1,
  },

  selectedLabel: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  selectedName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },

  selectedType: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
  },

  changeButton: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  changeButtonText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  performanceCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 15,
    gap: 14,
    marginBottom: 25,
  },

  inputGroup: {
    gap: 6,
  },

  inputLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  performanceInput: {
    height: 48,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    paddingHorizontal: 13,
    fontSize: 16,
    fontWeight: "800",
  },

  proofCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 15,
    marginBottom: 28,
  },

  proofDescription: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 15,
  },

  videoSelected: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  videoStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
    marginRight: 9,
  },

  videoInfo: {
    flex: 1,
  },

  videoStatus: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  videoName: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  removeVideoText: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  videoActions: {
    gap: 8,
  },

  videoButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  videoButtonLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  buttonPressed: {
    opacity: 0.55,
  },

  submitArea: {
    marginTop: 3,
  },

  submitNotice: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 10,
  },

  submitButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
  },

  submitButtonPressed: {
    opacity: 0.75,
  },

  submitButtonDisabled: {
    opacity: 0.45,
  },

  submitButtonText: {
    color: Colors.dark.background,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
