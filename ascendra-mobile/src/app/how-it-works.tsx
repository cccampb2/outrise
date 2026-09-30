import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";

type InfoItemProps = {
  title: string;
  children: React.ReactNode;
};

function InfoItem({ title, children }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoTitle}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

function SectionHeader({
  number,
  eyebrow,
  title,
}: {
  number: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <Text style={styles.sectionNumber}>{number}</Text>
    </View>
  );
}

export default function HowItWorksScreen() {
  return (
    <Screen scroll>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>ASCENDRA // SYSTEM_GUIDE</Text>

        <Text style={styles.title}>HOW_ASCENDRA_WORKS</Text>

        <Text style={styles.subtitle}>
          Understand progression, competition, records, and the systems that
          power Ascendra.
        </Text>

        <View style={styles.headerLine}>
          <View style={styles.headerLineAccent} />
        </View>
      </View>

      {/* PROGRESSION */}

      <SectionHeader number="01" eyebrow="CORE_SYSTEM" title="Progression" />

      <View style={styles.card}>
        <InfoItem title="XP">
          <BodyText>
            Completing workouts can earn experience points toward your permanent
            progression. Lifetime XP never resets, regardless of seasons or time
            away.
          </BodyText>
        </InfoItem>

        <InfoItem title="LEVELS">
          <BodyText>
            XP accumulates into levels. Each level requires more XP than the
            last, so progression remains steady while becoming increasingly
            difficult.
          </BodyText>
        </InfoItem>

        <InfoItem title="ECHELON">
          <BodyText>
            Every 50 levels unlocks a permanent Echelon rank — from Echelon I at
            level 50 through Echelon X at level 500, the maximum permanent rank.
          </BodyText>
        </InfoItem>

        <InfoItem title="ZENITH">
          <BodyText>
            Zenith is a live global ranking based on lifetime XP. Unlike
            Echelon, Zenith can be lost if another athlete passes you. It
            represents your current standing rather than a permanent rank.
          </BodyText>
        </InfoItem>

        <InfoItem title="DAILY_XP">
          <BodyText>
            Workout XP is subject to a daily cap. You can continue training
            after reaching it, but additional capped XP will not count toward
            your progression that day.
          </BodyText>
        </InfoItem>
      </View>

      {/* COMPETITION */}

      <SectionHeader
        number="02"
        eyebrow="COMPETITIVE_SYSTEM"
        title="Competition"
      />

      <View style={styles.card}>
        <InfoItem title="FACTIONS">
          <BodyText>
            Ascendra has four factions, each with its own identity. You are
            matched with a faction through an assessment after signup, and
            faction membership is permanent.
          </BodyText>
        </InfoItem>

        <InfoItem title="FACTION_SEASONS">
          <BodyText>
            Every quarter, factions compete for the highest combined seasonal
            XP. Seasonal faction totals reset when a new season begins. Your
            personal lifetime XP and level do not reset.
          </BodyText>
        </InfoItem>

        <InfoItem title="WORKOUT_OF_THE_WEEK">
          <BodyText>
            A featured weekly mission with its own difficulty, XP reward, and
            completion leaderboard.
          </BodyText>
        </InfoItem>

        <InfoItem title="LEADERBOARDS">
          <BodyText>
            Global rankings track competition across XP, level, Zenith, streaks,
            total workouts, and individual exercises.
          </BodyText>
        </InfoItem>

        <InfoItem title="CHALLENGES">
          <BodyText>
            Head-to-head competitions between two users are scored using real
            logged performances rather than manually entered challenge results.
          </BodyText>
        </InfoItem>
      </View>

      {/* TRAINING */}

      <SectionHeader
        number="03"
        eyebrow="TRAINING_SYSTEM"
        title="Training & Records"
      />

      <View style={styles.card}>
        <InfoItem title="PERSONAL_RECORDS">
          <BodyText>
            Ascendra recognizes performances as personal records only when they
            meet the requirements for that exercise's measurement type. Official
            rules are listed below.
          </BodyText>
        </InfoItem>

        <InfoItem title="VERIFICATION">
          <BodyText>
            Certain records and achievements can be submitted with video
            evidence for review, helping keep high-level leaderboard entries
            credible.
          </BodyText>
        </InfoItem>

        <InfoItem title="ACHIEVEMENTS">
          <BodyText>
            Achievements are permanent milestones earned through consistency,
            strength, competition, and challenges. Earned achievements remain
            visible on your profile.
          </BodyText>
        </InfoItem>
      </View>

      {/* PR RULES */}

      <SectionHeader
        number="04"
        eyebrow="PERFORMANCE_PROTOCOL"
        title="Official PR Rules"
      />

      <View style={styles.rulesIntro}>
        <Text style={styles.rulesIntroLabel}>PERSONAL_RECORDS</Text>

        <Text style={styles.rulesIntroText}>
          Only qualifying performances are recognized as official personal
          records.
        </Text>
      </View>

      <View style={styles.prCard}>
        <View style={styles.prHeader}>
          <Text style={styles.prNumber}>01</Text>
          <Text style={styles.prTitle}>WEIGHT + REPS</Text>
        </View>

        <Text style={styles.prLabel}>OFFICIAL_REP_RECORDS</Text>

        <View style={styles.repGrid}>
          {["1RM", "3RM", "5RM", "8RM", "10RM", "12RM"].map((rep) => (
            <View key={rep} style={styles.repBadge}>
              <Text style={styles.repBadgeText}>{rep}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.bodyText}>
          Your highest weight at each recognized rep count is your PR. Example:
          255 lb × 5 beats 250 lb × 5.
        </Text>
      </View>

      <View style={styles.prCard}>
        <View style={styles.prHeader}>
          <Text style={styles.prNumber}>02</Text>
          <Text style={styles.prTitle}>DISTANCE + TIME</Text>
        </View>

        <Text style={styles.prLabel}>OFFICIAL_DISTANCES</Text>

        <View style={styles.distanceGrid}>
          {[
            "100m",
            "200m",
            "400m",
            "800m",
            "1 Mile",
            "1.5 Miles",
            "2 Miles",
            "5K",
            "10K",
            "Half Marathon",
            "Marathon",
          ].map((distance) => (
            <View key={distance} style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{distance}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.bodyText}>
          Your fastest time at the exact distance is your PR. Longer distances
          are not converted into shorter-distance PRs.
        </Text>
      </View>

      <View style={styles.prCard}>
        <View style={styles.prHeader}>
          <Text style={styles.prNumber}>03</Text>
          <Text style={styles.prTitle}>REPS</Text>
        </View>

        <Text style={styles.bodyText}>
          Your highest number of completed reps is your PR.
        </Text>
      </View>

      <View style={styles.prCard}>
        <View style={styles.prHeader}>
          <Text style={styles.prNumber}>04</Text>
          <Text style={styles.prTitle}>TIME</Text>
        </View>

        <Text style={styles.bodyText}>
          Your fastest completion time is your PR.
        </Text>
      </View>

      <View style={styles.prCard}>
        <View style={styles.prHeader}>
          <Text style={styles.prNumber}>05</Text>
          <Text style={styles.prTitle}>DURATION</Text>
        </View>

        <Text style={styles.bodyText}>
          Your longest completed duration is your PR.
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerText}>ASCENDRA // SYSTEM_REFERENCE</Text>
        <View style={styles.footerLine} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 24,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  header: {
    marginBottom: 34,
  },

  eyebrow: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 10,
  },

  title: {
    color: Colors.dark.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    maxWidth: "94%",
  },

  headerLine: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 20,
  },

  headerLineAccent: {
    width: 48,
    height: 2,
    position: "absolute",
    top: -1,
    left: 0,
    backgroundColor: Colors.dark.accent,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 11,
    marginTop: 6,
  },

  sectionEyebrow: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 3,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "800",
  },

  sectionNumber: {
    color: Colors.dark.borderStrong,
    fontSize: 20,
    fontWeight: "900",
  },

  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 17,
    marginBottom: 30,
  },

  infoItem: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },

  infoTitle: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 7,
  },

  bodyText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },

  rulesIntro: {
    padding: 16,
    marginBottom: 9,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  rulesIntroLabel: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  rulesIntroText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  prCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 9,
  },

  prHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },

  prNumber: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
  },

  prTitle: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  prLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 9,
  },

  repGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 13,
  },

  repBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  repBadgeText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
  },

  distanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 13,
  },

  distanceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  distanceBadgeText: {
    color: Colors.dark.textSecondary,
    fontSize: 8,
    fontWeight: "800",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    marginBottom: 28,
  },

  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  footerText: {
    color: Colors.dark.textDim,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
