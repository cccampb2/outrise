import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";

import {
  getAdminVerifications,
  type Verification,
  type VerificationUser,
} from "@/api/verifications";

const PAGE_SIZE = 20;

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

function getExerciseName(verification: Verification) {
  if (typeof verification.exercise === "string") {
    return "EXERCISE";
  }

  return verification.exercise.name;
}

function getUsername(verification: Verification) {
  if (typeof verification.user === "string") {
    return "USER";
  }

  return (verification.user as VerificationUser).username;
}

function getPerformance(verification: Verification) {
  const { measurementType, performance } = verification;

  switch (measurementType) {
    case "weight_reps":
      if (performance.weightLbs == null || performance.reps == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return `${performance.weightLbs} LB × ${performance.reps}`;

    case "reps":
      if (performance.reps == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return `${performance.reps} REPS`;

    case "time":
    case "duration":
      if (performance.timeSeconds == null) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return formatTime(performance.timeSeconds);

    case "distance_time":
      if (
        performance.distanceMiles == null ||
        performance.timeSeconds == null
      ) {
        return "PERFORMANCE_UNAVAILABLE";
      }

      return `${performance.distanceMiles} MI // ${formatTime(
        performance.timeSeconds,
      )}`;

    default:
      return "PERFORMANCE_UNAVAILABLE";
  }
}

type VerificationRowProps = {
  verification: Verification;
};

function VerificationRow({ verification }: VerificationRowProps) {
  return (
    <Pressable
      onPress={() => router.push(`/admin/verifications/${verification._id}`)}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.rowTop}>
        <View style={styles.pendingIdentity}>
          <View style={styles.pendingDot} />

          <Text style={styles.pendingText}>PENDING</Text>
        </View>

        <Text style={styles.rowDate}>{formatDate(verification.createdAt)}</Text>
      </View>

      <Text style={styles.exerciseName}>{getExerciseName(verification)}</Text>

      <Text style={styles.performance}>{getPerformance(verification)}</Text>

      <View style={styles.userArea}>
        <View>
          <Text style={styles.userLabel}>SUBMITTED_BY</Text>

          <Text style={styles.username}>{getUsername(verification)}</Text>
        </View>

        <Text style={styles.reviewText}>REVIEW →</Text>
      </View>
    </Pressable>
  );
}

export default function AdminVerificationsScreen() {
  const verificationQuery = useInfiniteQuery({
    queryKey: ["admin-verifications", "pending"],

    initialPageParam: 1,

    queryFn: ({ pageParam }) =>
      getAdminVerifications(pageParam, PAGE_SIZE, "pending"),

    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;

      if (page >= totalPages) {
        return undefined;
      }

      return page + 1;
    },
  });

  const verifications =
    verificationQuery.data?.pages.flatMap((page) => page.verifications) ?? [];

  return (
    <Screen scroll>
      <View style={styles.page}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.rowPressed : null,
          ]}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ADMIN // VERIFICATION_SYSTEM</Text>

          <Text style={styles.title}>VERIFICATION_QUEUE</Text>

          <Text style={styles.subtitle}>PENDING_PERFORMANCE_PROOF</Text>
        </View>

        <View style={styles.queueStatus}>
          <View>
            <Text style={styles.queueLabel}>PENDING_REQUESTS</Text>

            <Text style={styles.queueCount}>
              {verificationQuery.isPending ? "---" : verifications.length}
            </Text>
          </View>

          <View style={styles.queueIndicator}>
            <View style={styles.queueDot} />

            <Text style={styles.queueState}>REVIEW_QUEUE</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>SUBMISSIONS</Text>

            <Text style={styles.sectionSubtitle}>AWAITING_REVIEW</Text>
          </View>

          <Text style={styles.sectionNumber}>01</Text>
        </View>

        {verificationQuery.isPending ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.dark.accent} />

            <Text style={styles.loadingText}>QUERYING_VERIFICATIONS...</Text>
          </View>
        ) : null}

        {verificationQuery.isError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorCode}>ERROR // REQUEST_FAILED</Text>

            <Text style={styles.errorTitle}>QUEUE_UNAVAILABLE</Text>

            <Text style={styles.errorDescription}>
              Unable to retrieve pending verification requests.
            </Text>

            <Pressable
              onPress={() => verificationQuery.refetch()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <Text style={styles.retryText}>RETRY_REQUEST</Text>
            </Pressable>
          </View>
        ) : null}

        {!verificationQuery.isPending &&
        !verificationQuery.isError &&
        verifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyCode}>QUEUE // CLEAR</Text>

            <Text style={styles.emptyTitle}>NO_PENDING_VERIFICATIONS</Text>

            <Text style={styles.emptyDescription}>
              There are currently no performance submissions awaiting review.
            </Text>
          </View>
        ) : null}

        {verifications.length > 0 ? (
          <View style={styles.rows}>
            {verifications.map((verification) => (
              <VerificationRow
                key={verification._id}
                verification={verification}
              />
            ))}
          </View>
        ) : null}

        {verificationQuery.hasNextPage ? (
          <Pressable
            disabled={verificationQuery.isFetchingNextPage}
            onPress={() => verificationQuery.fetchNextPage()}
            style={({ pressed }) => [
              styles.loadMoreButton,
              pressed ? styles.rowPressed : null,
            ]}
          >
            <Text style={styles.loadMoreText}>
              {verificationQuery.isFetchingNextPage
                ? "LOADING..."
                : "LOAD_MORE"}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>ASCENDRA // ADMIN_VERIFICATION</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 28,
  },

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

  header: {
    paddingBottom: 24,
  },

  eyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  title: {
    color: Colors.dark.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 9,
  },

  queueStatus: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  queueLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  queueCount: {
    color: Colors.dark.text,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 3,
  },

  queueIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  queueDot: {
    width: 5,
    height: 5,
    backgroundColor: Colors.dark.accent,
  },

  queueState: {
    color: Colors.dark.textMuted,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 36,
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

  loading: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },

  loadingText: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  rows: {
    gap: 10,
  },

  row: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  rowPressed: {
    opacity: 0.6,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pendingIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  pendingDot: {
    width: 5,
    height: 5,
    backgroundColor: Colors.dark.textSecondary,
  },

  pendingText: {
    color: Colors.dark.textSecondary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  rowDate: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  exerciseName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 17,
  },

  performance: {
    color: Colors.dark.textSecondary,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 5,
  },

  userArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 15,
    marginTop: 17,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderSubtle,
  },

  userLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  username: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
  },

  reviewText: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  errorPanel: {
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.dangerSurface,
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
    marginTop: 10,
  },

  errorDescription: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 15,
    marginTop: 7,
  },

  retryButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
  },

  retryText: {
    color: Colors.dark.textSecondary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  empty: {
    paddingVertical: 38,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  emptyCode: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 11,
  },

  emptyDescription: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 15,
    marginTop: 8,
  },

  loadMoreButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  loadMoreText: {
    color: Colors.dark.textSecondary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

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
