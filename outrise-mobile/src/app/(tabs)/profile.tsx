import { BrandHeader } from "@/components/brand-header";
import { UserRoleBadge } from "@/components/user-role-badge";
import { hasAdminAccess } from "@/constants/user-roles";
import { AppText as Text } from "@/components/app-text";
import { AccountFlagNotice } from "@/components/account-flag-notice";
import { ProfileRecords } from "@/components/profile-records";
import { View, Pressable, StyleSheet, Image, Alert } from "react-native";
import { Screen } from "@/components/screen";
import { deleteToken } from "@/storage/auth-storage";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { clearCurrentUser } from "@/store/auth-slice";
import { Colors, TAB_BAR_HEIGHT, Fonts } from "@/constants/theme";
import { getFactions } from "@/api/factions";
import { factionEmblems } from "@/constants/faction-assets";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkoutHistory, type WorkoutSession } from "@/api/workout-sessions";
import { EchelonEmblem } from "@/components/echelon-emblem";
import { ZenithEmblem } from "@/components/zenith-emblem";
import type { EchelonNumber } from "@/constants/echelon-assets";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getWorkoutSummary(workout: WorkoutSession) {
  const exercise = workout.exercises[0];

  if (!exercise) {
    return "NO DATA RECORDED";
  }

  const { actual } = exercise;

  switch (exercise.measurementType) {
    case "distance_time": {
      const parts = [exercise.exerciseName];

      if (actual.distanceMiles !== undefined) {
        parts.push(`${actual.distanceMiles} MI`);
      }

      if (actual.timeSeconds !== undefined) {
        parts.push(formatTime(actual.timeSeconds));
      }

      return parts.join(" // ");
    }

    case "reps": {
      const totalReps =
        actual.sets?.reduce((total, set) => total + (set.reps ?? 0), 0) ?? 0;

      return `${exercise.exerciseName} // ${totalReps} REPS`;
    }

    case "time":
    case "duration": {
      if (actual.timeSeconds === undefined) {
        return exercise.exerciseName;
      }

      return `${exercise.exerciseName} // ${formatTime(actual.timeSeconds)}`;
    }

    case "weight_reps": {
      const setCount = actual.sets?.length ?? 0;

      return `${exercise.exerciseName} // ${setCount} ${
        setCount === 1 ? "SET" : "SETS"
      }`;
    }

    case "intervals": {
      if (actual.roundsCompleted === undefined) {
        return exercise.exerciseName;
      }

      return `${exercise.exerciseName} // ${actual.roundsCompleted} ROUNDS`;
    }

    default:
      return exercise.exerciseName;
  }
}

function formatMemberSince(date: string) {
  const dateObject = new Date(date);

  return dateObject
    .toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();

  const user = useSelector((state: RootState) => state.auth.user);

  const workoutHistoryQuery = useQuery({
    queryKey: ["workout-history", 1, 5],
    queryFn: () => getWorkoutHistory(1, 5),
  });

  const factionsQuery = useQuery({
    queryKey: ["factions"],
    queryFn: getFactions,
  });

  const recentWorkouts = workoutHistoryQuery.data?.workoutSessions ?? [];

  const faction = factionsQuery.data?.factions.find(
    (f) => f._id === user?.faction,
  );

  async function performSignOut() {
    await deleteToken();
    dispatch(clearCurrentUser());
    await client.cancelQueries();
    client.clear();
    router.replace("/(auth)/login");
  }

  function signOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Outrise?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: performSignOut,
      },
    ]);
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {"// SYSTEM_ERROR: PROFILE_NOT_FOUND"}
          </Text>
        </View>
      </Screen>
    );
  }

  const isAdmin = hasAdminAccess(user.role);

  const echelon = user.progression.echelon as EchelonNumber | null;

  const zenithRank = user.ranking.zenithRank;

  const factionEmblem = faction ? factionEmblems[faction.slug] : null;

  const accent = faction?.colors.primary ?? Colors.dark.accent;

  const accentBorder = faction?.colors.border ?? Colors.dark.border;

  const progressPercent = Math.min(
    Math.max(user.progression.progressPercent, 0),
    100,
  );

  const progressTipPercent = Math.min(Math.max(progressPercent, 0), 99);

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <Screen scroll hideTabBarOnScroll bottomInSet={TAB_BAR_HEIGHT}>
      <View style={styles.page}>
        <AccountFlagNotice />
        {/* PROFILE HERO */}

        <View
          style={[
            styles.hero,
            {
              borderBottomColor: accentBorder,
            },
          ]}
        >
          <View
            style={[
              styles.heroGlow,
              {
                backgroundColor: accent,
              },
            ]}
          />

          <View style={styles.topBar}>
            <BrandHeader label={user.accountStatus.toUpperCase()} accentColor={accent} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={styles.badgeCode}>
              <Text
                style={[
                  styles.memberCode,
                  {
                    color: accent,
                  },
                ]}
              >
                {`LEVEL_${String(user.progression.level).padStart(3, "0")}`}
              </Text>
            </View>
            </View>
          </View>

          <View style={styles.heroIdentity}>
            {user.profileImage.url || factionEmblem ? (
              <View style={styles.emblemArea}>
                <View
                  style={[
                    styles.emblemOuterRing,
                    {
                      borderColor: accentBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.emblemRing,
                      {
                        borderColor: accent,
                      },
                    ]}
                  >
                    {user.profileImage.url ? (
                      <Image
                        source={{ uri: user.profileImage.url }}
                        style={styles.profileImage}
                        resizeMode="cover"
                      />
                    ) : factionEmblem ? (
                      <Image
                        source={factionEmblem}
                        style={styles.emblem}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                </View>

                <View
                  style={[
                    styles.emblemStatus,
                    {
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.heroIdentityText}>
              <Text style={styles.callsign}>{"// CALLSIGN_"}</Text>

              <Text style={styles.username} numberOfLines={1}>
                {user.username.toUpperCase()}
              </Text>

              <UserRoleBadge role={user.role} showLabel />

              {fullName ? (
                <Text style={styles.realName} numberOfLines={1}>
                  {fullName}
                </Text>
              ) : null}

              {faction ? (
                <View style={styles.factionIdentity}>
                  <View
                    style={[
                      styles.factionLine,
                      {
                        backgroundColor: accent,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.factionName,
                      {
                        color: accent,
                      },
                    ]}
                  >
                    {faction.name.toUpperCase()}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.memberSince}>
                {`MEMBER_SINCE // ${formatMemberSince(user.createdAt)}`}
              </Text>
            </View>
          </View>

          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {faction ? (
            <Text style={styles.factionTagline}>{`"${faction.tagline}"`}</Text>
          ) : null}

          <View style={styles.heroDivider} />

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>LEVEL</Text>

              <Text style={styles.heroStatValue}>{user.progression.level}</Text>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>TOTAL_XP</Text>

              <Text style={styles.heroStatValue}>
                {user.lifetimeXP.toLocaleString()}
              </Text>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>WORKOUTS</Text>

              <Text style={styles.heroStatValue}>{user.totalWorkouts}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* PROGRESSION */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>SYSTEM_TELEMETRY</Text>

              <Text style={styles.sectionTitle}>Progression</Text>
            </View>

            <Text style={styles.sectionNumber}>01</Text>
          </View>

          <View
            style={[
              styles.progressionCard,
              {
                borderColor: accentBorder,
              },
            ]}
          >
            <View
              style={[
                styles.hudCornerTL,
                {
                  borderColor: accent,
                },
              ]}
            />

            <View
              style={[
                styles.hudCornerBR,
                {
                  borderColor: accent,
                },
              ]}
            />

            <View style={styles.progressionHeader}>
              <View>
                <Text style={styles.dataLabel}>CURRENT_LEVEL</Text>

                <Text style={styles.levelValue}>{user.progression.level}</Text>
              </View>

              <View style={styles.nextLevelBlock}>
                <Text style={styles.dataLabel}>NEXT_LEVEL</Text>

                <Text style={styles.nextLevelValue}>
                  {user.progression.level + 1}
                </Text>
              </View>
            </View>

            <View style={styles.progressInformation}>
              <Text style={styles.progressText}>LEVEL_PROGRESS</Text>

              <Text style={styles.progressRemaining}>
                {`${user.progression.xpRemaining.toLocaleString()} XP TO GO`}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: accent,
                  },
                ]}
              />

              <View
                style={[
                  styles.progressTip,
                  {
                    left: `${progressTipPercent}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>

            <View style={styles.progressFooter}>
              <Text style={styles.progressFooterText}>
                {`${user.progression.xpIntoCurrentLevel.toLocaleString()} XP`}
              </Text>

              <Text
                style={[
                  styles.progressPercentage,
                  {
                    color: accent,
                  },
                ]}
              >
                {`[${Math.round(progressPercent)}%]`}
              </Text>

              <Text style={styles.progressFooterText}>
                {`${user.progression.xpRequiredForNextLevel.toLocaleString()} XP`}
              </Text>
            </View>
          </View>

          {/* OUTRISE STATUS */}

          <View style={styles.subsystemHeader}>
            <Text style={styles.subsystemLabel}>OUTRISE_STATUS</Text>

            <View style={styles.subsystemLine} />
          </View>

          <View style={styles.statusShowcase}>
            {/* ECHELON */}

            <View style={styles.statusPanel}>
              <View style={styles.statusPanelGrid}>
                <View style={styles.statusGridVertical} />
                <View style={styles.statusGridHorizontal} />

                <View style={styles.statusOrbitLarge} />
                <View style={styles.statusOrbitSmall} />
              </View>

              <View style={styles.statusPanelTop}>
                <Text style={styles.echelonPanelLabel}>ECHELON</Text>

                {echelon !== null ? (
                  <View style={styles.echelonActive}>
                    <View style={styles.echelonActiveDot} />

                    <Text style={styles.echelonActiveText}>ACTIVE</Text>
                  </View>
                ) : (
                  <Text style={styles.statusLockedLabel}>LOCKED</Text>
                )}
              </View>

              <View style={styles.statusEmblemArea}>
                {echelon !== null ? (
                  <>
                    <View style={styles.echelonGlow} />

                    <EchelonEmblem echelon={echelon} size={118} />
                  </>
                ) : (
                  <Text style={styles.statusLockedSymbol}>—</Text>
                )}
              </View>

              <View style={styles.statusInformation}>
                <Text style={styles.statusInfoLabel}>CURRENT_ECHELON</Text>

                <Text style={styles.statusInfoValue}>
                  {echelon !== null ? String(echelon).padStart(2, "0") : "--"}
                </Text>

                <Text style={styles.statusInfoMeta}>
                  {echelon !== null
                    ? `LEVEL_${String(echelon * 50).padStart(3, "0")}`
                    : "NOT_YET_UNLOCKED"}
                </Text>
              </View>
            </View>

            {/* ZENITH */}

            <View
              style={[
                styles.statusPanel,
                zenithRank !== null ? styles.zenithStatusPanel : null,
              ]}
            >
              <View style={styles.statusPanelGrid}>
                <View
                  style={[
                    styles.statusGridVertical,
                    zenithRank !== null ? styles.zenithGridLine : null,
                  ]}
                />

                <View
                  style={[
                    styles.statusGridHorizontal,
                    zenithRank !== null ? styles.zenithGridLine : null,
                  ]}
                />

                <View
                  style={[
                    styles.statusOrbitLarge,
                    zenithRank !== null ? styles.zenithOrbit : null,
                  ]}
                />

                <View
                  style={[
                    styles.statusOrbitSmall,
                    zenithRank !== null ? styles.zenithOrbit : null,
                  ]}
                />
              </View>

              <View style={styles.statusPanelTop}>
                <Text
                  style={[
                    styles.zenithPanelLabel,
                    zenithRank === null ? styles.statusInactiveLabel : null,
                  ]}
                >
                  ZENITH
                </Text>

                {zenithRank !== null ? (
                  <View style={styles.zenithActiveBadge}>
                    <View style={styles.zenithActiveDot} />

                    <Text style={styles.zenithActiveText}>ACTIVE</Text>
                  </View>
                ) : (
                  <Text style={styles.statusLockedLabel}>UNRANKED</Text>
                )}
              </View>

              <View style={styles.statusEmblemArea}>
                {zenithRank !== null ? (
                  <>
                    <View style={styles.zenithGlow} />

                    <ZenithEmblem rank={zenithRank} size={118} />
                  </>
                ) : (
                  <Text style={styles.statusLockedSymbol}>—</Text>
                )}
              </View>

              <View style={styles.statusInformation}>
                <Text style={styles.statusInfoLabel}>ZENITH_RANK</Text>

                <Text
                  style={[
                    styles.statusInfoValue,
                    zenithRank !== null ? styles.zenithInfoValue : null,
                  ]}
                >
                  {zenithRank !== null
                    ? String(zenithRank).padStart(2, "0")
                    : "--"}
                </Text>

                <Text style={styles.statusInfoMeta}>
                  {zenithRank !== null
                    ? "GLOBAL_TOP_25"
                    : "STATUS_NOT_ACQUIRED"}
                </Text>
              </View>
            </View>
          </View>

          {/* RANKINGS */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>GLOBAL_STANDING</Text>

              <Text style={styles.sectionTitle}>Rankings</Text>
            </View>

            <Text style={styles.sectionNumber}>02</Text>
          </View>

          <View style={styles.rankingCard}>
            <View style={styles.rankingIdentity}>
              <Text style={styles.dataLabel}>GLOBAL_RANK</Text>

              <Text style={styles.rankDescription}>WORLDWIDE_POSITION</Text>
            </View>

            <View style={styles.rankingDivider} />

            <View style={styles.rankingValue}>
              <Text style={styles.rankHash}>#</Text>

              <Text style={styles.globalRankValue}>
                {user.ranking.globalRank !== null
                  ? user.ranking.globalRank
                  : "---"}
              </Text>
            </View>
          </View>

        <ProfileRecords userId={user.id} />

          {/* RECENT ACTIVITY */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>WORKOUT_HISTORY</Text>

              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>

            <Text style={styles.sectionNumber}>03</Text>
          </View>

          <View style={styles.activityContainer}>
            {workoutHistoryQuery.isPending ? (
              <Text style={styles.emptyText}>
                {"// LOADING_WORKOUT_HISTORY..."}
              </Text>
            ) : workoutHistoryQuery.isError ? (
              <Text style={styles.emptyText}>
                {"// ERROR: UNABLE_TO_LOAD_HISTORY"}
              </Text>
            ) : recentWorkouts.length === 0 ? (
              <Text style={styles.emptyText}>{"// NO_WORKOUTS_RECORDED"}</Text>
            ) : (
              recentWorkouts.map((workout, index) => (
                <Pressable
                  key={workout._id}
                  onPress={() => router.push(`/workout-session/${workout._id}`)}
                  style={({ pressed }) => [
                    styles.activityRow,
                    pressed ? styles.activityRowPressed : null,
                  ]}
                >
                  <View style={styles.activityTimeline}>
                    <View
                      style={[
                        styles.activityNode,
                        {
                          borderColor: accent,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.activityNodeInner,
                          {
                            backgroundColor:
                              index === 0 ? accent : "transparent",
                          },
                        ]}
                      />
                    </View>

                    {index < recentWorkouts.length - 1 ? (
                      <View style={styles.activityTimelineLine} />
                    ) : null}
                  </View>

                  <View style={styles.activityContent}>
                    <View style={styles.activityTop}>
                      <Text style={styles.workoutName} numberOfLines={1}>
                        {workout.workoutName.toUpperCase()}
                      </Text>

                      <Text style={styles.workoutDate}>
                        {new Date(workout.completedAt ?? workout.startedAt)
                          .toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                          .toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.workoutSummary} numberOfLines={1}>
                      {getWorkoutSummary(workout)}
                    </Text>

                    <View style={styles.activityFooter}>
                      <Text
                        style={[
                          styles.activityStatus,
                          {
                            color: accent,
                          },
                        ]}
                      >
                        {"[COMPLETED]"}
                      </Text>

                      <Text
                        style={[
                          styles.activityArrow,
                          {
                            color: accent,
                          },
                        ]}
                      >
                        →
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          {/* VERIFICATION */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>PERFORMANCE_PROOF</Text>

              <Text style={styles.sectionTitle}>Verification</Text>
            </View>

            <Text style={styles.sectionNumber}>04</Text>
          </View>

          <Pressable
            onPress={() => router.push("/verifications")}
            style={({ pressed }) => [
              styles.verificationButton,
              pressed ? styles.verificationButtonPressed : null,
            ]}
          >
            <View style={styles.verificationContent}>
              <View style={styles.verificationCodeArea}>
                <Text style={styles.verificationCode}>VERIFY</Text>

                <View style={styles.verificationCodeLine} />
              </View>

              <View style={styles.verificationTextArea}>
                <Text style={styles.verificationLabel}>
                  PERFORMANCE_VERIFICATION
                </Text>

                <Text style={styles.verificationTitle}>
                  Verification Center
                </Text>

                <Text style={styles.verificationDescription}>
                  SUBMIT_PROOF // REVIEW_STATUS // HISTORY
                </Text>
              </View>
            </View>

            <Text style={styles.verificationArrow}>→</Text>
          </Pressable>

          {/* ADMIN CENTER */}

          {isAdmin ? (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>
                    SYSTEM_ADMINISTRATION
                  </Text>

                  <Text style={styles.sectionTitle}>Admin</Text>
                </View>

                <Text style={styles.sectionNumber}>05</Text>
              </View>

              <Pressable
                onPress={() => router.push("/admin")}
                style={({ pressed }) => [
                  styles.adminButton,
                  pressed ? styles.adminButtonPressed : null,
                ]}
              >
                <View style={styles.adminContent}>
                  <View style={styles.adminCodeArea}>
                    <Text style={styles.adminCode}>ADMIN</Text>

                    <View style={styles.adminCodeLine} />
                  </View>

                  <View style={styles.adminTextArea}>
                    <Text style={styles.adminLabel}>AUTHORIZED_ACCESS</Text>

                    <Text style={styles.adminTitle}>Admin Center</Text>

                    <Text style={styles.adminDescription}>
                      VERIFICATIONS // SYSTEM_TOOLS // MANAGEMENT
                    </Text>
                  </View>
                </View>

                <Text style={styles.adminArrow}>→</Text>
              </Pressable>
            </>
          ) : null}

          {/* ACCOUNT */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>ACCOUNT_DETAILS</Text>

              <Text style={styles.sectionTitle}>Account</Text>
            </View>

            <Text style={styles.sectionNumber}>{isAdmin ? "06" : "05"}</Text>
          </View>

          <View style={styles.accountCard}>
            <Pressable
              onPress={() => router.push("/profile/edit")}
              style={({ pressed }) => [
                styles.accountActionRow,
                pressed ? styles.accountActionRowPressed : null,
              ]}
            >
              <View style={styles.accountText}>
                <Text style={styles.dataLabel}>PROFILE</Text>

                <Text style={styles.accountActionValue}>Edit Profile</Text>
              </View>

              <Text style={styles.accountActionArrow}>→</Text>
            </Pressable>

            <View style={styles.accountDivider} />

            <View style={styles.accountRow}>
              <View style={styles.accountText}>
                <Text style={styles.dataLabel}>USERNAME</Text>

                <Text style={styles.accountValue}>{user.username}</Text>
              </View>

              <Text style={styles.accountMeta}>{"[VERIFIED]"}</Text>
            </View>

            <View style={styles.accountDivider} />

            <View style={styles.accountRow}>
              <View style={styles.accountText}>
                <Text style={styles.dataLabel}>EMAIL</Text>

                <Text style={styles.accountValue} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              <Text style={styles.accountMeta}>{"[PRIVATE]"}</Text>
            </View>
            <View style={styles.accountDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/report-issue")}
              style={({ pressed }) => [styles.accountActionRow, pressed && styles.accountActionRowPressed]}
            >
              <View style={styles.accountText}>
                <Text style={styles.dataLabel}>SUPPORT</Text>
                <Text style={styles.accountActionValue}>Report an issue</Text>
              </View>
              <Text style={styles.accountActionArrow}>→</Text>
            </Pressable>
            <View style={styles.accountDivider} />
            <Pressable accessibilityRole="button" onPress={() => router.push("/suggest-feature")}
              style={({ pressed }) => [styles.accountActionRow, pressed && styles.accountActionRowPressed]}>
              <View style={styles.accountText}>
                <Text style={styles.dataLabel}>YOUR IDEAS</Text>
                <Text style={styles.accountActionValue}>Suggest a feature</Text>
              </View>
              <Text style={styles.accountActionArrow}>→</Text>
            </Pressable>
          </View>

          {/* SIGN OUT */}

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed ? styles.signOutButtonPressed : null,
            ]}
          >
            <View style={styles.signOutLine} />

            <Text style={styles.signOutText}>SIGN_OUT</Text>

            <View style={styles.signOutLine} />
          </Pressable>

          {/* BRAND */}

          <View style={styles.brandFooter}>
            <View style={styles.brandLine} />

            <Text style={styles.brandWordmark}>OUTRISE</Text>

            <View style={styles.brandLine} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    marginHorizontal: -16,
    marginTop: -8,
    backgroundColor: Colors.dark.background,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    color: Colors.dark.accent,
    fontSize: 12,
    letterSpacing: 1.5,

  },

  /* HERO */

  hero: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: Colors.dark.backgroundElement,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
  },

  heroGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.08,
    top: -160,
    left: -100,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 26,
  },

  badgeCode: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  memberCode: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  heroIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },

  emblemArea: {
    position: "relative",
  },

  emblemOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  emblemRing: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    borderWidth: 1,
    backgroundColor: Colors.dark.backgroundDeep,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  emblem: {
    width: 68,
    height: 68,
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
  },

  emblemStatus: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    right: 4,
    bottom: 8,
    borderWidth: 2,
    borderColor: Colors.dark.backgroundElement,
  },

  heroIdentityText: {
    flex: 1,
  },

  callsign: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },

  username: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 2,
  },

  realName: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  factionIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },

  factionLine: {
    width: 14,
    height: 2,
  },

  factionName: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  memberSince: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 8,
  },

  bio: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
  },

  factionTagline: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 18,
    lineHeight: 16,
  },

  heroDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 20,
    marginBottom: 16,
  },

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroStat: {
    flex: 1,
  },

  heroStatLabel: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  heroStatValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "900",
  },

  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.dark.borderSubtle,
    marginHorizontal: 12,
  },

  /* CONTENT */

  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 34,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 10,
  },

  sectionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
  },

  sectionTitle: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  sectionNumber: {
    fontFamily: Fonts.display,
    color: Colors.dark.border,
    fontSize: 20,
    fontWeight: "900",
  },

  hudCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    zIndex: 2,
  },

  hudCornerBR: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    zIndex: 2,
  },

  /* PROGRESSION */

  progressionCard: {
    position: "relative",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },

  progressionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  dataLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  levelValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: "900",
    letterSpacing: -1.5,
    marginTop: 2,
  },

  nextLevelBlock: {
    alignItems: "flex-end",
  },

  nextLevelValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 5,
  },

  progressInformation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  progressRemaining: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  progressTrack: {
    position: "relative",
    height: 4,
    backgroundColor: Colors.dark.borderSubtle,
  },

  progressFill: {
    height: "100%",
  },

  progressTip: {
    position: "absolute",
    width: 2,
    height: 10,
    top: -3,
    marginLeft: -1,
  },

  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  progressFooterText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "700",
  },

  progressPercentage: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* OUTRISE STATUS */

  subsystemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  subsystemLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  subsystemLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
  },

  statusShowcase: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 34,
  },

  statusPanel: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    minHeight: 250,
    backgroundColor: Colors.dark.echelonSurface,
    borderWidth: 1,
    borderColor: Colors.dark.echelonBorder,
  },

  zenithStatusPanel: {
    backgroundColor: Colors.dark.zenithSurface,
    borderColor: Colors.dark.zenithBorder,
  },

  statusPanelGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.4,
  },

  statusGridVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#18314A",
  },

  statusGridHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "45%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#18314A",
  },

  statusOrbitLarge: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#163047",
    alignSelf: "center",
    top: 39,
  },

  statusOrbitSmall: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#1C3C59",
    alignSelf: "center",
    top: 59,
  },

  zenithGridLine: {
    backgroundColor: Colors.dark.zenithBorder,
  },

  zenithOrbit: {
    borderColor: Colors.dark.zenithBorder,
  },

  statusPanelTop: {
    minHeight: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    zIndex: 2,
  },

  echelonPanelLabel: {
    color: Colors.dark.echelonMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  zenithPanelLabel: {
    color: Colors.dark.zenith,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  statusInactiveLabel: {
    color: Colors.dark.textTechnical,
  },

  statusLockedLabel: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  echelonActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  echelonActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.echelon,
  },

  echelonActiveText: {
    color: Colors.dark.echelonMuted,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  zenithActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  zenithActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.zenith,
  },

  zenithActiveText: {
    color: Colors.dark.zenith,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  statusEmblemArea: {
    height: 135,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  echelonGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.echelonGlow,
    opacity: 0.08,
  },

  zenithGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.zenith,
    opacity: 0.07,
  },

  statusLockedSymbol: {
    fontFamily: Fonts.display,
    color: Colors.dark.borderStrong,
    fontSize: 42,
    fontWeight: "900",
  },

  statusInformation: {
    flex: 1,
    minHeight: 75,
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundDeep,
    paddingHorizontal: 11,
    paddingVertical: 9,
    zIndex: 3,
  },

  statusInfoLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  statusInfoValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },

  zenithInfoValue: {
    color: Colors.dark.zenith,
  },

  statusInfoMeta: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 3,
  },

  /* RANKINGS */

  rankingCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    marginBottom: 32,
  },

  rankingIdentity: {
    flex: 1,
  },

  rankingDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.dark.borderSubtle,
    marginHorizontal: 18,
  },

  rankingValue: {
    minWidth: 80,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },

  rankHash: {
    color: Colors.dark.textDim,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
    marginRight: 3,
  },

  globalRankValue: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },

  rankDescription: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 5,
  },

  /* ACTIVITY */

  activityContainer: {
    marginBottom: 32,
  },

  activityRow: {
    flexDirection: "row",
    minHeight: 92,
  },

  activityRowPressed: {
    opacity: 0.5,
  },

  activityTimeline: {
    width: 26,
    alignItems: "center",
  },

  activityNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  activityNodeInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  activityTimelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 4,
  },

  activityContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
    paddingBottom: 14,
    marginBottom: 14,
    paddingLeft: 6,
  },

  activityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  workoutName: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  workoutDate: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  workoutSummary: {
    color: Colors.dark.textMuted,
    fontSize: 10,

    marginTop: 6,
  },

  activityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  activityStatus: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  activityArrow: {
    fontSize: 12,
    fontWeight: "900",
  },

  emptyText: {
    color: Colors.dark.textDim,
    fontSize: 11,

    marginBottom: 24,
  },

  /* VERIFICATION */

  verificationButton: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    paddingHorizontal: 16,
    marginBottom: 32,
  },

  verificationButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  verificationContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  verificationCodeArea: {
    width: 44,
    marginRight: 14,
  },

  verificationCode: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  verificationCodeLine: {
    width: 24,
    height: 1,
    backgroundColor: Colors.dark.accent,
    marginTop: 7,
  },

  verificationTextArea: {
    flex: 1,
  },

  verificationLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  verificationTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },

  verificationDescription: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 5,
  },

  verificationArrow: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 12,
  },

  /* ADMIN */

  adminButton: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    paddingHorizontal: 16,
    marginBottom: 32,
  },

  adminButtonPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  adminContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  adminCodeArea: {
    width: 44,
    marginRight: 14,
  },

  adminCode: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  adminCodeLine: {
    width: 24,
    height: 1,
    backgroundColor: Colors.dark.accent,
    marginTop: 7,
  },

  adminTextArea: {
    flex: 1,
  },

  adminLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  adminTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },

  adminDescription: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginTop: 5,
  },

  adminArrow: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 12,
  },

  /* ACCOUNT */

  accountCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  accountRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  accountActionRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  accountActionRowPressed: {
    opacity: 0.55,
  },

  accountText: {
    flex: 1,
  },

  accountValue: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  accountActionValue: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },

  accountActionArrow: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "900",
  },

  accountMeta: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  accountDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  /* SIGN OUT */

  signOutButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 6,
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
  },

  signOutButtonPressed: {
    backgroundColor: Colors.dark.dangerSurfacePressed,
  },

  signOutLine: {
    width: 24,
    height: 1,
    backgroundColor: Colors.dark.dangerBorder,
  },

  signOutText: {
    color: Colors.dark.danger,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },

  /* BRAND */

  brandFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 40,
    marginBottom: 12,
    paddingHorizontal: 20,
  },

  brandLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  brandWordmark: {
    color: Colors.dark.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4.5,
  },
});
