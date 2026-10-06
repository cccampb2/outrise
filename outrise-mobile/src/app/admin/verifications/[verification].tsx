import { ExpiredVerificationProof } from "@/components/expired-verification-proof";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveVerification,
  getAdminVerification,
  rejectVerification,
  type Verification,
  type VerificationExercise,
  type VerificationUser,
} from "@/api/verifications";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPerformance(verification: Verification) {
  const { performance, measurementType } = verification;

  switch (measurementType) {
    case "weight_reps":
      return `${performance.weightLbs ?? "--"} LB × ${
        performance.reps ?? "--"
      } REPS`;

    case "reps":
      return `${performance.reps ?? "--"} REPS`;

    case "time":
      return performance.timeSeconds !== null &&
        performance.timeSeconds !== undefined
        ? formatDuration(performance.timeSeconds)
        : "--";

    case "distance_time": {
      const distance =
        performance.distanceMiles !== null &&
        performance.distanceMiles !== undefined
          ? `${performance.distanceMiles} MI`
          : "-- MI";

      const time =
        performance.timeSeconds !== null &&
        performance.timeSeconds !== undefined
          ? formatDuration(performance.timeSeconds)
          : "--";

      return `${distance} // ${time}`;
    }

    case "duration":
      return performance.timeSeconds !== null &&
        performance.timeSeconds !== undefined
        ? formatDuration(performance.timeSeconds)
        : "--";

    default:
      return "--";
  }
}

function formatMeasurementType(
  measurementType: Verification["measurementType"],
) {
  switch (measurementType) {
    case "weight_reps":
      return "WEIGHT + REPS";

    case "reps":
      return "REPETITIONS";

    case "time":
      return "TIME";

    case "distance_time":
      return "DISTANCE + TIME";

    case "duration":
      return "DURATION";

    default:
      return measurementType;
  }
}

function formatDate(date: string) {
  return new Date(date)
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase();
}

function getUsername(user: string | VerificationUser) {
  if (typeof user === "string") {
    return "USER";
  }

  return user.username;
}

function getExerciseName(exercise: string | VerificationExercise) {
  if (typeof exercise === "string") {
    return "EXERCISE";
  }

  return exercise.name;
}

type VerificationVideoProps = {
  url: string;
};

function VerificationVideo({ url }: VerificationVideoProps) {
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <View style={styles.videoPanel}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />

      <View style={styles.videoFooter}>
        <Text style={styles.videoType}>VIDEO_PROOF</Text>

        <View style={styles.videoAvailable}>
          <View style={styles.videoAvailableDot} />

          <Text style={styles.videoAvailableText}>AVAILABLE</Text>
        </View>
      </View>
    </View>
  );
}

export default function AdminVerificationScreen() {
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{
    verification?: string | string[];
  }>();

  const verificationId = Array.isArray(params.verification)
    ? params.verification[0]
    : params.verification;

  const [showRejectForm, setShowRejectForm] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");

  const verificationQuery = useQuery({
    queryKey: ["admin-verification", verificationId],
    queryFn: () => getAdminVerification(verificationId!),
    enabled: Boolean(verificationId),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveVerification(verificationId!),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-verification", verificationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-verifications"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["verifications"],
        }),
      ]);

      Alert.alert(
        "Verification Approved",
        "The performance has been approved.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    },

    onError: (error) => {
      Alert.alert(
        "Approval Failed",
        error instanceof Error
          ? error.message
          : "Unable to approve verification.",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      rejectVerification({
        verificationId: verificationId!,
        rejectionReason: rejectionReason.trim(),
      }),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-verification", verificationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-verifications"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["verifications"],
        }),
      ]);

      Alert.alert(
        "Verification Rejected",
        "The performance has been rejected.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    },

    onError: (error) => {
      Alert.alert(
        "Rejection Failed",
        error instanceof Error
          ? error.message
          : "Unable to reject verification.",
      );
    },
  });

  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  function handleApprove() {
    Alert.alert(
      "Approve Verification?",
      "Approve this submitted performance?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: () => {
            approveMutation.mutate();
          },
        },
      ],
    );
  }

  function handleReject() {
    const reason = rejectionReason.trim();

    if (!reason) {
      Alert.alert(
        "Reason Required",
        "Enter a rejection reason before rejecting this verification.",
      );

      return;
    }

    Alert.alert(
      "Reject Verification?",
      "The rejection reason will be saved with this submission.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            rejectMutation.mutate();
          },
        },
      ],
    );
  }

  if (!verificationId) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.errorCode}>{"// ERROR"}</Text>

          <Text style={styles.errorTitle}>VERIFICATION_ID_MISSING</Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.backStateButton}
          >
            <Text style={styles.backStateButtonText}>← BACK</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (verificationQuery.isPending) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.loadingText}>
            {"// QUERYING_VERIFICATION..."}
          </Text>
        </View>
      </Screen>
    );
  }

  if (verificationQuery.isError || !verificationQuery.data?.verification) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.errorCode}>{"// SYSTEM_ERROR"}</Text>

          <Text style={styles.errorTitle}>UNABLE_TO_LOAD_VERIFICATION</Text>

          <Pressable
            onPress={() => verificationQuery.refetch()}
            style={styles.backStateButton}
          >
            <Text style={styles.backStateButtonText}>RETRY</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const verification = verificationQuery.data.verification;

  const username = getUsername(verification.user);

  const exerciseName = getExerciseName(verification.exercise);

  const isPending = verification.status === "pending";

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        {/* BACK */}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.backButtonPressed : null,
          ]}
        >
          <Text style={styles.backButtonText}>← BACK</Text>
        </Pressable>

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.eyebrow}>ADMIN // VERIFICATION_REVIEW</Text>

              <Text style={styles.title}>Performance Verification</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                verification.status === "approved"
                  ? styles.statusApproved
                  : verification.status === "rejected"
                    ? styles.statusRejected
                    : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  verification.status === "approved"
                    ? styles.statusTextApproved
                    : verification.status === "rejected"
                      ? styles.statusTextRejected
                      : styles.statusTextPending,
                ]}
              >
                {verification.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.headerDescription}>
            REVIEW_SUBMITTED_PERFORMANCE // VALIDATE_PROOF
          </Text>
        </View>

        {/* SUBJECT */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>01</Text>

          <View>
            <Text style={styles.sectionEyebrow}>SUBMISSION_IDENTITY</Text>

            <Text style={styles.sectionTitle}>Subject</Text>
          </View>
        </View>

        <View style={styles.dataPanel}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>SUBMITTED_BY</Text>

            <Text style={styles.dataValue}>{username}</Text>
          </View>

          <View style={styles.dataDivider} />

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>EXERCISE</Text>

            <Text style={styles.dataValue} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>

          <View style={styles.dataDivider} />

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>MEASUREMENT</Text>

            <Text style={styles.dataValue}>
              {formatMeasurementType(verification.measurementType)}
            </Text>
          </View>
        </View>

        {/* PERFORMANCE */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>02</Text>

          <View>
            <Text style={styles.sectionEyebrow}>CLAIMED_RESULT</Text>

            <Text style={styles.sectionTitle}>Performance</Text>
          </View>
        </View>

        <View style={styles.performancePanel}>
          <View style={styles.hudCornerTL} />

          <View style={styles.hudCornerBR} />

          <Text style={styles.performanceLabel}>PERFORMANCE_CLAIM</Text>

          <Text style={styles.performanceValue}>
            {formatPerformance(verification)}
          </Text>

          <View style={styles.performanceFooter}>
            <Text style={styles.performanceMeta}>
              {verification.measurementType.toUpperCase()}
            </Text>

            <Text style={styles.performanceMeta}>USER_SUBMITTED</Text>
          </View>
        </View>

        {/* PROOF */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>03</Text>

          <View>
            <Text style={styles.sectionEyebrow}>EVIDENCE_STREAM</Text>

            <Text style={styles.sectionTitle}>Proof</Text>
          </View>
        </View>

        {verification.proof?.url ? (
          <VerificationVideo url={verification.proof.url} />
        ) : (
          <ExpiredVerificationProof expired={!!verification.proofDeletedAt} />
        )}

        {/* SUBMISSION DATA */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>04</Text>

          <View>
            <Text style={styles.sectionEyebrow}>SUBMISSION_METADATA</Text>

            <Text style={styles.sectionTitle}>Review Data</Text>
          </View>
        </View>

        <View style={styles.dataPanel}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>STATUS</Text>

            <Text
              style={[
                styles.dataValue,
                verification.status === "approved"
                  ? styles.approvedText
                  : verification.status === "rejected"
                    ? styles.rejectedText
                    : styles.pendingText,
              ]}
            >
              {verification.status.toUpperCase()}
            </Text>
          </View>

          <View style={styles.dataDivider} />

          <View style={styles.metadataRow}>
            <Text style={styles.dataLabel}>SUBMITTED</Text>

            <Text style={styles.metadataValue}>
              {formatDate(verification.createdAt)}
            </Text>
          </View>

          {verification.reviewedAt ? (
            <>
              <View style={styles.dataDivider} />

              <View style={styles.metadataRow}>
                <Text style={styles.dataLabel}>REVIEWED</Text>

                <Text style={styles.metadataValue}>
                  {formatDate(verification.reviewedAt)}
                </Text>
              </View>
            </>
          ) : null}

          {verification.rejectionReason ? (
            <>
              <View style={styles.dataDivider} />

              <View style={styles.rejectionData}>
                <Text style={styles.dataLabel}>REJECTION_REASON</Text>

                <Text style={styles.rejectionReasonText}>
                  {verification.rejectionReason}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ADMIN DECISION */}

        {isPending ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionCode}>05</Text>

              <View>
                <Text style={styles.sectionEyebrow}>ADMIN_DECISION</Text>

                <Text style={styles.sectionTitle}>Review</Text>
              </View>
            </View>

            <View style={styles.reviewPanel}>
              <Text style={styles.reviewLabel}>REVIEW_PROTOCOL</Text>

              <Text style={styles.reviewDescription}>
                Confirm that the submitted video clearly demonstrates the
                claimed performance before approving.
              </Text>

              {showRejectForm ? (
                <View style={styles.rejectionForm}>
                  <Text style={styles.rejectionFormLabel}>
                    REJECTION_REASON
                  </Text>

                  <TextInput
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    placeholder="Explain why this submission is being rejected..."
                    placeholderTextColor={Colors.dark.textDim}
                    multiline
                    maxLength={1000}
                    editable={!isMutating}
                    style={styles.rejectionInput}
                    textAlignVertical="top"
                  />

                  <View style={styles.characterCountRow}>
                    <Text style={styles.characterCount}>
                      {`${rejectionReason.length}/1000`}
                    </Text>
                  </View>

                  <View style={styles.rejectionActions}>
                    <Pressable
                      disabled={isMutating}
                      onPress={() => {
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }}
                      style={({ pressed }) => [
                        styles.cancelRejectButton,
                        pressed ? styles.buttonPressed : null,
                      ]}
                    >
                      <Text style={styles.cancelRejectText}>CANCEL</Text>
                    </Pressable>

                    <Pressable
                      disabled={isMutating}
                      onPress={handleReject}
                      style={({ pressed }) => [
                        styles.confirmRejectButton,
                        pressed ? styles.buttonPressed : null,
                        isMutating ? styles.buttonDisabled : null,
                      ]}
                    >
                      <Text style={styles.confirmRejectText}>
                        {rejectMutation.isPending
                          ? "REJECTING..."
                          : "CONFIRM_REJECTION"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.decisionActions}>
                  <Pressable
                    disabled={isMutating}
                    onPress={() => setShowRejectForm(true)}
                    style={({ pressed }) => [
                      styles.rejectButton,
                      pressed ? styles.buttonPressed : null,
                      isMutating ? styles.buttonDisabled : null,
                    ]}
                  >
                    <Text style={styles.rejectButtonText}>REJECT</Text>
                  </Pressable>

                  <Pressable
                    disabled={isMutating}
                    onPress={handleApprove}
                    style={({ pressed }) => [
                      styles.approveButton,
                      pressed ? styles.buttonPressed : null,
                      isMutating ? styles.buttonDisabled : null,
                    ]}
                  >
                    <Text style={styles.approveButtonText}>
                      {approveMutation.isPending ? "APPROVING..." : "APPROVE"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.completedPanel}>
            <Text style={styles.completedLabel}>REVIEW_COMPLETE</Text>

            <Text style={styles.completedText}>
              {verification.status === "approved"
                ? "THIS PERFORMANCE HAS BEEN APPROVED."
                : "THIS PERFORMANCE HAS BEEN REJECTED."}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>OUTRISE // ADMIN</Text>

          <View style={styles.footerLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 40,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  errorCode: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
  },

  errorTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 8,
  },

  backStateButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },

  backStateButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 10,
  },

  backButtonPressed: {
    opacity: 0.5,
  },

  backButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  header: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
    paddingBottom: 20,
    marginBottom: 28,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 5,
  },

  headerDescription: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 10,
  },

  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusPending: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSelected,
  },

  statusApproved: {
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundSelected,
  },

  statusRejected: {
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.dangerSurface,
  },

  statusText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  statusTextPending: {
    color: Colors.dark.accent,
  },

  statusTextApproved: {
    color: Colors.dark.textSecondary,
  },

  statusTextRejected: {
    color: Colors.dark.danger,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },

  sectionCode: {
    color: Colors.dark.borderStrong,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 1,
  },

  dataPanel: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: 14,
    marginBottom: 28,
  },

  dataRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  dataDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  dataLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  dataValue: {
    flexShrink: 1,
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  metadataRow: {
    minHeight: 58,
    justifyContent: "center",
  },

  metadataValue: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 5,
  },

  rejectionData: {
    paddingVertical: 14,
  },

  rejectionReasonText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },

  pendingText: {
    color: Colors.dark.accent,
  },

  approvedText: {
    color: Colors.dark.text,
  },

  rejectedText: {
    color: Colors.dark.danger,
  },

  performancePanel: {
    position: "relative",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundSelected,
    padding: 18,
    marginBottom: 28,
  },

  hudCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.dark.accent,
  },

  hudCornerBR: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.dark.accent,
  },

  performanceLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  performanceValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 8,
  },

  performanceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
    marginTop: 16,
    paddingTop: 10,
  },

  performanceMeta: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  videoPanel: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    marginBottom: 28,
  },

  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  videoFooter: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  videoType: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  videoAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  videoAvailableDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },

  videoAvailableText: {
    color: Colors.dark.textMuted,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  reviewPanel: {
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    padding: 16,
    marginBottom: 28,
  },

  reviewLabel: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  reviewDescription: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },

  decisionActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  rejectButton: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.dangerSurface,
  },

  rejectButtonText: {
    color: Colors.dark.danger,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  approveButton: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSelected,
  },

  approveButtonText: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  buttonPressed: {
    opacity: 0.55,
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  rejectionForm: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
    marginTop: 18,
    paddingTop: 16,
  },

  rejectionFormLabel: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 8,
  },

  rejectionInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.backgroundDeep,
    color: Colors.dark.text,
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
  },

  characterCountRow: {
    alignItems: "flex-end",
    marginTop: 5,
  },

  characterCount: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "800",
  },

  rejectionActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  cancelRejectButton: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  cancelRejectText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  confirmRejectButton: {
    flex: 1.5,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.dangerSurface,
  },

  confirmRejectText: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  completedPanel: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    padding: 16,
    marginTop: 4,
    marginBottom: 28,
  },

  completedLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  completedText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 7,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },

  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  footerText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
