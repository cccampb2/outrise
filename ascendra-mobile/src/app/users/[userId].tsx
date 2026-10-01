import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getPublicUser, type PublicUser } from "@/api/users";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { factionEmblems } from "@/constants/faction-assets";

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatMemberSince(date: string) {
  return new Date(date)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

function getEchelonLabel(echelon: number | null) {
  if (echelon === null) {
    return "ECHELON --";
  }

  return `ECHELON ${echelon}`;
}

type StatCellProps = {
  label: string;
  value: string;
  accent?: boolean;
  factionColor?: string;
};

function StatCell({
  label,
  value,
  accent = false,
  factionColor,
}: StatCellProps) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>

      <Text
        style={[
          styles.statValue,
          accent && {
            color: factionColor ?? Colors.dark.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

type ProgressPanelProps = {
  user: PublicUser;
};

function ProgressPanel({ user }: ProgressPanelProps) {
  const {
    level,
    xpIntoCurrentLevel,
    xpRequiredForNextLevel,
    xpRemaining,
    progressPercent,
  } = user.progression;

  const clampedProgress = Math.max(0, Math.min(progressPercent, 100));

  return (
    <View style={styles.progressPanel}>
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.progressLabel}>CURRENT_LEVEL</Text>

          <Text style={styles.progressLevel}>LEVEL {level}</Text>
        </View>

        <View style={styles.progressNumbers}>
          <Text style={styles.progressCurrent}>
            {formatNumber(xpIntoCurrentLevel)}
          </Text>

          <Text style={styles.progressTotal}>
            {" / "}
            {formatNumber(xpRequiredForNextLevel)} XP
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${clampedProgress}%`,
            },
          ]}
        />
      </View>

      <View style={styles.progressFooter}>
        <Text style={styles.progressPercent}>
          {clampedProgress.toFixed(1)}%
        </Text>

        <Text style={styles.progressRemaining}>
          {formatNumber(xpRemaining)} XP TO LEVEL {level + 1}
        </Text>
      </View>
    </View>
  );
}

export default function PublicUserProfileScreen() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const userQuery = useQuery({
    queryKey: ["public-user", userId],
    queryFn: () => getPublicUser(userId!),
    enabled: Boolean(userId),
  });

  if (!userId) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.errorCode}>{"// ERROR"}</Text>

          <Text style={styles.errorTitle}>USER_ID_MISSING</Text>

          <Pressable onPress={() => router.back()} style={styles.stateButton}>
            <Text style={styles.stateButtonText}>← BACK</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (userQuery.isPending) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.loadingText}>
            {"// QUERYING_USER_PROFILE..."}
          </Text>
        </View>
      </Screen>
    );
  }

  if (userQuery.isError || !userQuery.data?.user) {
    return (
      <Screen>
        <View style={styles.centerState}>
          <Text style={styles.errorCode}>{"// SYSTEM_ERROR"}</Text>

          <Text style={styles.errorTitle}>UNABLE_TO_LOAD_USER</Text>

          <Pressable
            onPress={() => userQuery.refetch()}
            style={styles.stateButton}
          >
            <Text style={styles.stateButtonText}>RETRY</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={styles.secondaryStateButton}
          >
            <Text style={styles.secondaryStateButtonText}>← BACK</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const user = userQuery.data.user;

  const factionColor = user.faction?.colors.primary ?? Colors.dark.accent;

  const globalRank =
    user.ranking.globalRank !== null ? `#${user.ranking.globalRank}` : "#---";

  const zenithRank = user.ranking.zenithRank;

  return (
    <Screen scroll>
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
          <Text style={styles.eyebrow}>ASCENDRA // USER_PROFILE</Text>

          <Text style={styles.headerTitle}>Operative Profile</Text>

          <Text style={styles.headerDescription}>
            PUBLIC_COMPETITIVE_RECORD
          </Text>
        </View>

        {/* IDENTITY */}

        <View
          style={[
            styles.identityPanel,
            {
              borderColor:
                user.faction?.colors.border ?? Colors.dark.borderStrong,
            },
          ]}
        >
          <View
            style={[
              styles.identityAccent,
              {
                backgroundColor: factionColor,
              },
            ]}
          />

          <View style={styles.identityTop}>
            <View
              style={[
                styles.emblemContainer,
                {
                  borderColor:
                    user.faction?.colors.border ?? Colors.dark.borderStrong,
                  backgroundColor:
                    user.faction?.colors.darkSurface ??
                    Colors.dark.backgroundDeep,
                },
              ]}
            >
              {user.faction ? (
                <Image
                  source={factionEmblems[user.faction.slug]}
                  style={styles.factionEmblem}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.unassignedMark}>//</Text>
              )}
            </View>

            <View style={styles.identityContent}>
              <Text style={styles.identityLabel}>USER_IDENTITY</Text>

              <Text style={styles.username} numberOfLines={1}>
                {user.username}
              </Text>

              <Text
                style={[
                  styles.factionName,
                  {
                    color: factionColor,
                  },
                ]}
              >
                {user.faction
                  ? `${user.faction.name.toUpperCase()} // MEMBER`
                  : "FACTION // UNASSIGNED"}
              </Text>
            </View>
          </View>

          <View style={styles.identityDivider} />

          <View style={styles.identityProgression}>
            <View>
              <Text style={styles.progressionSmallLabel}>PROGRESSION</Text>

              <Text style={styles.echelonValue}>
                {getEchelonLabel(user.progression.echelon)}
              </Text>
            </View>

            <View style={styles.identityLevelBlock}>
              <Text style={styles.progressionSmallLabel}>LEVEL</Text>

              <Text style={styles.levelValue}>{user.progression.level}</Text>
            </View>
          </View>
        </View>

        {/* COMPETITIVE RECORD */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>01</Text>

          <View>
            <Text style={styles.sectionEyebrow}>COMPETITIVE_RECORD</Text>

            <Text style={styles.sectionTitle}>Statistics</Text>
          </View>
        </View>

        <View style={styles.statsPanel}>
          <View style={styles.statsRow}>
            <StatCell
              label="LIFETIME_XP"
              value={formatNumber(user.lifetimeXP)}
            />

            <View style={styles.statDivider} />

            <StatCell label="GLOBAL_RANK" value={globalRank} />
          </View>

          <View style={styles.statsHorizontalDivider} />

          <View style={styles.statsRow}>
            <StatCell
              label="TOTAL_WORKOUTS"
              value={formatNumber(user.totalWorkouts)}
            />

            <View style={styles.statDivider} />

            <StatCell
              label="FACTION"
              value={
                user.faction ? user.faction.name.toUpperCase() : "UNASSIGNED"
              }
              accent={Boolean(user.faction)}
              factionColor={factionColor}
            />
          </View>
        </View>

        {/* ZENITH */}

        {zenithRank !== null ? (
          <View style={styles.zenithPanel}>
            <View>
              <Text style={styles.zenithLabel}>ZENITH_STATUS</Text>

              <Text style={styles.zenithTitle}>ZENITH {zenithRank}</Text>
            </View>

            <View style={styles.zenithRankBox}>
              <Text style={styles.zenithRankPrefix}>Z</Text>

              <Text style={styles.zenithRankNumber}>{zenithRank}</Text>
            </View>
          </View>
        ) : null}

        {/* PROGRESSION */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>02</Text>

          <View>
            <Text style={styles.sectionEyebrow}>LIFETIME_PROGRESSION</Text>

            <Text style={styles.sectionTitle}>Progress</Text>
          </View>
        </View>

        <ProgressPanel user={user} />

        {/* MEMBERSHIP */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCode}>03</Text>

          <View>
            <Text style={styles.sectionEyebrow}>ACCOUNT_RECORD</Text>

            <Text style={styles.sectionTitle}>Membership</Text>
          </View>
        </View>

        <View style={styles.membershipPanel}>
          <View>
            <Text style={styles.membershipLabel}>MEMBER_SINCE</Text>

            <Text style={styles.membershipValue}>
              {formatMemberSince(user.createdAt)}
            </Text>
          </View>

          <View
            style={[
              styles.membershipIndicator,
              {
                borderColor: factionColor,
              },
            ]}
          >
            <View
              style={[
                styles.membershipDot,
                {
                  backgroundColor: factionColor,
                },
              ]}
            />

            <Text
              style={[
                styles.membershipStatus,
                {
                  color: factionColor,
                },
              ]}
            >
              ACTIVE
            </Text>
          </View>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>ASCENDRA // PROFILE</Text>

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
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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

  stateButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },

  stateButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  secondaryStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 6,
  },

  secondaryStateButtonText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
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
    marginBottom: 22,
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  headerTitle: {
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
    letterSpacing: 1.2,
    marginTop: 8,
  },

  identityPanel: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: Colors.dark.backgroundElement,
    padding: 18,
    marginBottom: 30,
  },

  identityAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 3,
    height: "100%",
  },

  identityTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  emblemContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  factionEmblem: {
    width: 52,
    height: 52,
  },

  unassignedMark: {
    color: Colors.dark.textDim,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },

  identityContent: {
    flex: 1,
  },

  identityLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  username: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },

  factionName: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginTop: 5,
  },

  identityDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginVertical: 17,
  },

  identityProgression: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  progressionSmallLabel: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  echelonValue: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  identityLevelBlock: {
    alignItems: "flex-end",
  },

  levelValue: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 10,
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

  statsPanel: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    marginBottom: 12,
  },

  statsRow: {
    minHeight: 88,
    flexDirection: "row",
  },

  statCell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  statDivider: {
    width: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  statsHorizontalDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  statLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  statValue: {
    color: Colors.dark.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 5,
  },

  zenithPanel: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.dark.zenithBorder,
    backgroundColor: Colors.dark.zenithSurface,
    paddingHorizontal: 16,
    marginBottom: 30,
  },

  zenithLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  zenithTitle: {
    color: Colors.dark.zenith,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 4,
  },

  zenithRankBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },

  zenithRankPrefix: {
    color: Colors.dark.zenith,
    fontSize: 10,
    fontWeight: "900",
  },

  zenithRankNumber: {
    color: Colors.dark.zenith,
    fontSize: 29,
    fontWeight: "900",
  },

  progressPanel: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    padding: 16,
    marginBottom: 30,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },

  progressLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  progressLevel: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },

  progressNumbers: {
    flexDirection: "row",
    alignItems: "baseline",
  },

  progressCurrent: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },

  progressTotal: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
  },

  progressTrack: {
    height: 6,
    overflow: "hidden",
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    marginTop: 15,
  },

  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
  },

  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  progressPercent: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
  },

  progressRemaining: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  membershipPanel: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    paddingHorizontal: 16,
    marginBottom: 30,
  },

  membershipLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  membershipValue: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
  },

  membershipIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  membershipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  membershipStatus: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
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
