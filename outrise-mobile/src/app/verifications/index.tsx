import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";

import {
  getVerifications,
  type Verification,
  type VerificationStatus,
} from "@/api/verifications";

type StatusFilter = "all" | VerificationStatus;

const PAGE_SIZE = 20;

const FILTERS: {
  label: string;
  value: StatusFilter;
}[] = [
  {
    label: "ALL",
    value: "all",
  },
  {
    label: "PENDING",
    value: "pending",
  },
  {
    label: "APPROVED",
    value: "approved",
  },
  {
    label: "REJECTED",
    value: "rejected",
  },
];

function formatDate(date: string) {
  return new Date(date)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

function getPerformanceLabel(verification: Verification) {
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

type StatusBadgeProps = {
  status: VerificationStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyle = getStatusStyle(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          borderColor: statusStyle.border,
          backgroundColor: statusStyle.background,
        },
      ]}
    >
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
          styles.statusText,
          {
            color: statusStyle.text,
          },
        ]}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

type VerificationRowProps = {
  verification: Verification;
  isLast: boolean;
};

function VerificationRow({ verification, isLast }: VerificationRowProps) {
  return (
    <Pressable
      onPress={() => router.push(`/verifications/${verification._id}`)}
      style={({ pressed }) => [
        styles.verificationRow,

        !isLast ? styles.verificationRowBorder : null,

        pressed ? styles.verificationRowPressed : null,
      ]}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowTitleArea}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {getExerciseName(verification)}
          </Text>

          <Text style={styles.measurementType}>
            {formatMeasurementType(verification.measurementType)}
          </Text>
        </View>

        <StatusBadge status={verification.status} />
      </View>

      <View style={styles.performanceArea}>
        <Text style={styles.performanceLabel}>PERFORMANCE</Text>

        <Text style={styles.performanceValue}>
          {getPerformanceLabel(verification)}
        </Text>
      </View>

      <View style={styles.rowBottom}>
        <Text style={styles.dateText}>
          {`SUBMITTED // ${formatDate(verification.createdAt)}`}
        </Text>

        <Text style={styles.rowArrow}>→</Text>
      </View>
    </Pressable>
  );
}

export default function VerificationsScreen() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const verificationsQuery = useInfiniteQuery({
    queryKey: ["verifications", statusFilter],

    initialPageParam: 1,

    queryFn: ({ pageParam }) =>
      getVerifications(
        pageParam,
        PAGE_SIZE,
        statusFilter === "all" ? undefined : statusFilter,
      ),

    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;

      if (page >= totalPages) {
        return undefined;
      }

      return page + 1;
    },
  });

  const verifications =
    verificationsQuery.data?.pages.flatMap((page) => page.verifications) ?? [];

  return (
    <Screen scroll>
      <View style={styles.page}>
        {/* HEADER */}

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

        <View style={styles.header}>
          <BrandHeader label="VERIFICATION" style={styles.brandLabelLayout} />

          <Text style={styles.title}>
            PERFORMANCE_
            {"\n"}
            VERIFICATION
          </Text>

          <Text style={styles.subtitle}>
            Submit performance proof and track review status.
          </Text>
        </View>

        {/* SUBMIT COMMAND */}

        <Pressable
          onPress={() => router.push("/verifications/submit")}
          style={({ pressed }) => [
            styles.submitButton,
            pressed ? styles.submitButtonPressed : null,
          ]}
        >
          <View style={styles.submitLeft}>
            <Text style={styles.submitCode}>01</Text>

            <View>
              <Text style={styles.submitTitle}>SUBMIT_VERIFICATION</Text>

              <Text style={styles.submitDescription}>
                VIDEO_PROOF // ADMIN_REVIEW
              </Text>
            </View>
          </View>

          <Text style={styles.submitArrow}>→</Text>
        </Pressable>

        {/* FILTERS */}

        <View style={styles.filterHeader}>
          <Text style={styles.sectionLabel}>SUBMISSION_LOG</Text>

          <Text style={styles.sectionCode}>FILTER // STATUS</Text>
        </View>

        <View style={styles.filters}>
          {FILTERS.map((filter) => {
            const selected = filter.value === statusFilter;

            return (
              <Pressable
                key={filter.value}
                onPress={() => setStatusFilter(filter.value)}
                style={({ pressed }) => [
                  styles.filterButton,

                  selected ? styles.filterButtonSelected : null,

                  pressed ? styles.filterButtonPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,

                    selected ? styles.filterTextSelected : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* INITIAL LOADING */}

        {verificationsQuery.isPending ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={Colors.dark.accent} />

            <Text style={styles.stateCode}>QUERYING_VERIFICATION_LOG...</Text>
          </View>
        ) : null}

        {/* ERROR */}

        {verificationsQuery.isError ? (
          <View style={styles.statePanel}>
            <Text style={styles.errorCode}>ERROR // REQUEST_FAILED</Text>

            <Text style={styles.stateTitle}>VERIFICATION_LOG_UNAVAILABLE</Text>

            <Text style={styles.stateDescription}>
              Unable to retrieve your verification submissions.
            </Text>

            <Pressable
              onPress={() => verificationsQuery.refetch()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <Text style={styles.retryText}>RETRY_REQUEST</Text>
            </Pressable>
          </View>
        ) : null}

        {/* EMPTY */}

        {!verificationsQuery.isPending &&
        !verificationsQuery.isError &&
        verifications.length === 0 ? (
          <View style={styles.statePanel}>
            <Text style={styles.stateNumber}>00</Text>

            <Text style={styles.stateTitle}>NO_SUBMISSIONS</Text>

            <Text style={styles.stateDescription}>
              {statusFilter === "all"
                ? "No performance verification requests have been submitted."
                : `No ${statusFilter} verification requests found.`}
            </Text>

            {statusFilter === "all" ? (
              <Pressable
                onPress={() => router.push("/verifications/submit")}
                style={({ pressed }) => [
                  styles.emptyAction,
                  pressed ? styles.submitButtonPressed : null,
                ]}
              >
                <Text style={styles.emptyActionText}>SUBMIT_VIDEO_PROOF</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* RESULTS */}

        {!verificationsQuery.isError && verifications.length > 0 ? (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>RESULTS</Text>

              <Text style={styles.resultCount}>
                {String(verifications.length).padStart(2, "0")}
              </Text>
            </View>

            <View style={styles.verificationList}>
              {verifications.map((verification, index) => (
                <VerificationRow
                  key={verification._id}
                  verification={verification}
                  isLast={index === verifications.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* LOAD MORE */}

        {verificationsQuery.hasNextPage ? (
          <Pressable
            disabled={verificationsQuery.isFetchingNextPage}
            onPress={() => verificationsQuery.fetchNextPage()}
            style={({ pressed }) => [
              styles.loadMoreButton,
              pressed ? styles.controlPressed : null,
            ]}
          >
            {verificationsQuery.isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={Colors.dark.textSecondary}
              />
            ) : (
              <>
                <Text style={styles.loadMoreText}>LOAD_MORE</Text>

                <Text style={styles.loadMoreArrow}>↓</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {/* FOOTER */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>OUTRISE // VERIFICATION_SYSTEM</Text>
        </View>
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

  /* HEADER */

  header: {
    paddingBottom: 24,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 29,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.6,
  },

  subtitle: {
    maxWidth: 290,
    color: Colors.dark.textMuted,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 12,
  },

  /* SUBMIT */

  submitButton: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  submitButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  submitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  submitCode: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  submitTitle: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  submitDescription: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginTop: 6,
  },

  submitArrow: {
    color: Colors.dark.accent,
    fontSize: 18,
    fontWeight: "500",
  },

  /* FILTER */

  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 36,
    marginBottom: 12,
  },

  sectionLabel: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  sectionCode: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  filters: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.border,
  },

  filterButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  filterButtonSelected: {
    borderBottomColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSelected,
  },

  filterButtonPressed: {
    backgroundColor: Colors.dark.backgroundElement,
  },

  filterText: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  filterTextSelected: {
    color: Colors.dark.text,
  },

  /* RESULTS */

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 10,
  },

  resultLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  resultCount: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  verificationList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  /* ROW */

  verificationRow: {
    minHeight: 150,
    paddingVertical: 18,
    paddingHorizontal: 4,
  },

  verificationRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },

  verificationRowPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  rowTitleArea: {
    flex: 1,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },

  measurementType: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 6,
  },

  /* STATUS */

  statusBadge: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
  },

  statusDot: {
    width: 4,
    height: 4,
  },

  statusText: {
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* PERFORMANCE */

  performanceArea: {
    marginTop: 22,
  },

  performanceLabel: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  performanceValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 5,
  },

  rowBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 17,
  },

  dateText: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  rowArrow: {
    color: Colors.dark.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },

  /* LOADING / EMPTY / ERROR */

  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 190,
    gap: 16,
  },

  stateCode: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  statePanel: {
    marginTop: 28,
    paddingVertical: 30,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  stateNumber: {
    fontFamily: Fonts.display,
    color: Colors.dark.borderStrong,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -2,
  },

  errorCode: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  stateTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 12,
  },

  stateDescription: {
    maxWidth: 280,
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

  emptyAction: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 15,
    marginTop: 20,
    backgroundColor: Colors.dark.accent,
  },

  emptyActionText: {
    color: Colors.dark.backgroundDeep,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* LOAD MORE */

  loadMoreButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },

  loadMoreText: {
    color: Colors.dark.textSecondary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  loadMoreArrow: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  /* FOOTER */

  footer: {
    marginTop: 42,
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
