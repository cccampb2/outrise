import { ExpiredVerificationProof } from "@/components/expired-verification-proof";
import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";

import {
  getVerification,
  type Verification,
  type VerificationStatus,
} from "@/api/verifications";

function formatDateTime(date: string) {
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

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }

  return [minutes, seconds.toString().padStart(2, "0")].join(":");
}

function formatMeasurementType(
  measurementType: Verification["measurementType"],
) {
  switch (measurementType) {
    case "weight_reps":
      return "WEIGHT_REPS";

    case "reps":
      return "REPS";

    case "time":
      return "TIME";

    case "distance_time":
      return "DISTANCE_TIME";

    case "duration":
      return "DURATION";

    default:
      return "PERFORMANCE";
  }
}

function getExerciseName(verification: Verification) {
  if (typeof verification.exercise === "string") {
    return "EXERCISE";
  }

  return verification.exercise.name;
}

function getPerformanceValue(verification: Verification) {
  const { measurementType, performance } = verification;

  switch (measurementType) {
    case "weight_reps": {
      if (performance.weightLbs == null || performance.reps == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return `${performance.weightLbs} LB × ${performance.reps}`;
    }

    case "reps": {
      if (performance.reps == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return `${performance.reps} REPS`;
    }

    case "time": {
      if (performance.timeSeconds == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return formatTime(performance.timeSeconds);
    }

    case "distance_time": {
      if (
        performance.distanceMiles == null ||
        performance.timeSeconds == null
      ) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return `${performance.distanceMiles} MI // ${formatTime(
        performance.timeSeconds,
      )}`;
    }

    case "duration": {
      if (performance.timeSeconds == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return formatTime(performance.timeSeconds);
    }

    default:
      return "PERFORMANCE_UNAVAILABLE";
  }
}

function getStatusStyle(status: VerificationStatus) {
  switch (status) {
    case "approved":
      return {
        text: "#62C995",
        border: "#1B4A38",
        background: "#07120E",
      };

    case "rejected":
      return {
        text: Colors.dark.danger,
        border: Colors.dark.dangerBorder,
        background: Colors.dark.dangerSurface,
      };

    case "pending":
    default:
      return {
        text: Colors.dark.textSecondary,
        border: Colors.dark.borderStrong,
        background: Colors.dark.backgroundSelected,
      };
  }
}

type StatusPanelProps = {
  verification: Verification;
};

function StatusPanel({ verification }: StatusPanelProps) {
  const statusStyle = getStatusStyle(verification.status);

  let description = verification.pendingExpiresAt
    ? `Waiting for review. If not reviewed, this submission expires on ${formatDateTime(verification.pendingExpiresAt)}.`
    : "Waiting for review. Unreviewed submissions expire 30 days after submission.";

  if (verification.status === "expired") {
    description =
      "This submission expired without review. You can submit a new verification. This is not a rejection.";
  }

  if (verification.status === "approved") {
    description = "This performance has been approved.";
  }

  if (verification.status === "rejected") {
    description = "This performance was not approved.";
  }

  return (
    <View
      style={[
        styles.statusPanel,
        {
          borderColor: statusStyle.border,
          backgroundColor: statusStyle.background,
        },
      ]}
    >
      <View style={styles.statusTop}>
        <View style={styles.statusIdentity}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusStyle.text,
              },
            ]}
          />

          <Text
            style={[
              styles.statusName,
              {
                color: statusStyle.text,
              },
            ]}
          >
            {verification.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.statusCode}>REVIEW_STATUS</Text>
      </View>

      <Text style={styles.statusDescription}>{description}</Text>
    </View>
  );
}

type DataRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function DataRow({ label, value, isLast = false }: DataRowProps) {
  return (
    <View style={[styles.dataRow, !isLast ? styles.dataRowBorder : null]}>
      <Text style={styles.dataLabel}>{label}</Text>

      <Text style={styles.dataValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
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

export default function VerificationDetailScreen() {
  const params = useLocalSearchParams<{
    verification?: string | string[];
  }>();

  const verificationId = Array.isArray(params.verification)
    ? params.verification[0]
    : params.verification;

  const verificationQuery = useQuery({
    queryKey: ["verification", verificationId],

    queryFn: () => {
      if (!verificationId) {
        throw new Error("Verification ID is required.");
      }

      return getVerification(verificationId);
    },

    enabled: Boolean(verificationId),
  });

  const verification = verificationQuery.data?.verification;

  return (
    <Screen scroll>
      <View style={styles.page}>
        {/* BACK */}

        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.controlPressed : null,
          ]}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        {/* LOADING */}

        {verificationQuery.isPending ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.dark.accent} />

            <Text style={styles.loadingText}>QUERYING_VERIFICATION...</Text>
          </View>
        ) : null}

        {/* ERROR */}

        {verificationQuery.isError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorCode}>ERROR // REQUEST_FAILED</Text>

            <Text style={styles.errorTitle}>VERIFICATION_UNAVAILABLE</Text>

            <Text style={styles.errorDescription}>
              Unable to retrieve this verification.
            </Text>

            <Pressable
              onPress={() => verificationQuery.refetch()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <Text style={styles.retryText}>RETRY_REQUEST</Text>
            </Pressable>
          </View>
        ) : null}

        {/* VERIFICATION */}

        {verification ? (
          <>
            {/* HEADER */}

            <View style={styles.header}>
              <BrandHeader
                label="VERIFICATION"
                style={styles.brandLabelLayout}
              />

              <Text style={styles.exerciseName}>
                {getExerciseName(verification)}
              </Text>

              <Text style={styles.measurementType}>
                {formatMeasurementType(verification.measurementType)}
              </Text>
            </View>

            {/* STATUS */}

            <StatusPanel verification={verification} />

            {/* PERFORMANCE */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>PERFORMANCE</Text>

                  <Text style={styles.sectionSubtitle}>SUBMITTED_RESULT</Text>
                </View>

                <Text style={styles.sectionNumber}>01</Text>
              </View>

              <View style={styles.performancePanel}>
                <Text style={styles.performanceLabel}>CLAIMED_PERFORMANCE</Text>

                <Text style={styles.performanceValue}>
                  {getPerformanceValue(verification)}
                </Text>

                <View style={styles.performanceRule} />

                <Text style={styles.performanceType}>
                  {formatMeasurementType(verification.measurementType)}
                </Text>
              </View>
            </View>

            {/* VIDEO PROOF */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>VIDEO_PROOF</Text>

                  <Text style={styles.sectionSubtitle}>SUBMITTED_MEDIA</Text>
                </View>

                <Text style={styles.sectionNumber}>02</Text>
              </View>

              {verification.proof?.url ? (
                <VerificationVideo url={verification.proof.url} />
              ) : (
                <ExpiredVerificationProof
                  expired={!!verification.proofDeletedAt}
                  pendingExpired={verification.status === "expired"}
                />
              )}
            </View>

            {/* REVIEW INFORMATION */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>REVIEW_DETAILS</Text>

                  <Text style={styles.sectionSubtitle}>
                    VERIFICATION_RECORD
                  </Text>
                </View>

                <Text style={styles.sectionNumber}>03</Text>
              </View>

              <View style={styles.dataPanel}>
                <DataRow
                  label="STATUS"
                  value={verification.status.toUpperCase()}
                />

                <DataRow
                  label="SUBMITTED"
                  value={formatDateTime(verification.createdAt)}
                />

                {verification.reviewedAt ? (
                  <DataRow
                    label="REVIEWED"
                    value={formatDateTime(verification.reviewedAt)}
                  />
                ) : null}

                <DataRow
                  label="VERIFICATION_ID"
                  value={verification._id}
                  isLast={!verification.rejectionReason}
                />

                {verification.rejectionReason ? (
                  <DataRow
                    label="REJECTION_REASON"
                    value={verification.rejectionReason}
                    isLast
                  />
                ) : null}
              </View>
            </View>

            {verification.status === "expired" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/verifications/submit")}
                style={styles.backButton}
              >
                <Text style={styles.backText}>SUBMIT A NEW VERIFICATION →</Text>
              </Pressable>
            ) : null}

            {/* REJECTION DETAIL */}

            {verification.status === "rejected" &&
            verification.rejectionReason ? (
              <View style={styles.section}>
                <View style={styles.rejectionPanel}>
                  <Text style={styles.rejectionLabel}>REJECTION_REASON</Text>

                  <Text style={styles.rejectionReason}>
                    {verification.rejectionReason}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* FOOTER */}

            <View style={styles.footer}>
              <View style={styles.footerLine} />

              <Text style={styles.footerText}>
                OUTRISE // VERIFICATION_SYSTEM
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 10,
  },

  page: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 28,
  },

  /* BACK */

  backButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    justifyContent: "center",
    marginBottom: 14,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  controlPressed: {
    opacity: 0.55,
  },

  /* LOADING */

  loadingContainer: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },

  loadingText: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* ERROR */

  errorPanel: {
    paddingVertical: 30,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  errorCode: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  errorTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 12,
  },

  errorDescription: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 8,
  },

  retryButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  retryText: {
    color: Colors.dark.textSecondary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* HEADER */

  header: {
    paddingBottom: 24,
  },

  exerciseName: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  measurementType: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 9,
  },

  /* STATUS */

  statusPanel: {
    padding: 16,
    borderWidth: 1,
  },

  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  statusDot: {
    width: 5,
    height: 5,
  },

  statusName: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  statusCode: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  statusDescription: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 13,
  },

  /* SECTIONS */

  section: {
    marginTop: 36,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  sectionSubtitle: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 5,
  },

  sectionNumber: {
    color: Colors.dark.borderStrong,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* PERFORMANCE */

  performancePanel: {
    minHeight: 145,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  performanceLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  performanceValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 7,
  },

  performanceRule: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 20,
    marginBottom: 10,
  },

  performanceType: {
    color: Colors.dark.textMuted,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* VIDEO */

  videoPanel: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  video: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  videoFooter: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  videoType: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  videoAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  videoAvailableDot: {
    width: 4,
    height: 4,
    backgroundColor: Colors.dark.accent,
  },

  videoAvailableText: {
    color: Colors.dark.textMuted,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* DATA */

  dataPanel: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  dataRow: {
    minHeight: 64,
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
  },

  dataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },

  dataLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  dataValue: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 6,
  },

  /* REJECTION */

  rejectionPanel: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.dangerSurface,
  },

  rejectionLabel: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  rejectionReason: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    lineHeight: 17,
    fontWeight: "500",
    marginTop: 10,
  },

  /* FOOTER */

  footer: {
    marginTop: 44,
    alignItems: "center",
  },

  footerLine: {
    width: 36,
    height: 1,
    backgroundColor: Colors.dark.borderStrong,
    marginBottom: 12,
  },

  footerText: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
