import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";

const communityRules = [
  {
    number: "01",
    title: "RESPECT_OTHER_MEMBERS",
    paragraphs: [
      "No harassment, bullying, threats, intimidation, or targeted abuse.",
      "Competitive banter is fine, but repeatedly attacking or degrading another member is not.",
    ],
  },
  {
    number: "02",
    title: "KEEP_LANGUAGE_APPROPRIATE",
    paragraphs: [
      "Do not use excessive profanity or vulgar language.",
      "Do not use slurs, hateful language, sexually explicit language, or language intended to demean or attack another person.",
      "Outrise should remain a community that people can comfortably use in public and around others.",
    ],
  },
  {
    number: "03",
    title: "NO_EXPLICIT_OR_ILLICIT_CONTENT",
    paragraphs: [
      "No pornography, nudity, sexually explicit material, or sexually exploitative content.",
      "No graphic violence or gore.",
      "No content promoting illegal drugs, criminal activity, or other illegal behavior.",
      "No content intended to facilitate dangerous or unlawful activity.",
    ],
  },
  {
    number: "04",
    title: "FITNESS_CONTENT_AND_PROOF",
    paragraphs: [
      "Do not intentionally submit fraudulent verification evidence.",
      "Do not manipulate images or videos to falsely represent a performance.",
      "Do not impersonate another athlete or submit another person's performance as your own.",
      "Verification proof should clearly show enough information for an administrator to reasonably review the claimed performance.",
    ],
  },
  {
    number: "05",
    title: "NO_SPAM_OR_ABUSE",
    paragraphs: [
      "No spam posts, repeated unwanted messages, scams, malicious links, automated abuse, or attempts to manipulate Outrise systems.",
      "Do not exploit XP, achievements, leaderboards, factions, verification, or other Outrise systems.",
    ],
  },
  {
    number: "06",
    title: "PROTECT_PRIVACY",
    paragraphs: [
      "Do not post another person's private information without permission.",
      "Do not use Outrise to dox, stalk, threaten, or expose another member's personal information.",
    ],
  },
];

const enforcementLevels = [
  {
    number: "01",
    title: "WARNING",
    description:
      "Minor or first-time violations may result in a warning and removal of the offending content.",
  },
  {
    number: "02",
    title: "TEMPORARY_RESTRICTIONS",
    description:
      "Repeated or more serious violations may result in temporary restrictions on features such as posting, commenting, messaging, uploading media, or submitting verifications.",
  },
  {
    number: "03",
    title: "TEMPORARY_SUSPENSION",
    description:
      "Serious or repeated violations may result in temporary suspension of the account.",
  },
  {
    number: "04",
    title: "PERMANENT_BAN",
    description:
      "Severe violations, repeated abuse, dangerous behavior, exploitation of Outrise systems, or attempts to evade previous enforcement may result in permanent account removal.",
  },
];

export default function CommunityStandardsScreen() {
  return (
    <Screen scroll>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      <View style={styles.header}>
        <BrandHeader label="COMMUNITY" style={styles.brandLabelLayout} />

        <Text style={styles.title}>COMMUNITY_STANDARDS</Text>

        <Text style={styles.subtitle}>
          Outrise is a competitive fitness community. Competition,
          encouragement, and friendly trash talk are welcome — but everyone is
          expected to keep the community respectful and safe.
        </Text>

        <View style={styles.headerLine}>
          <View style={styles.headerLineAccent} />
        </View>
      </View>

      <View style={styles.protocol}>
        <Text style={styles.protocolLabel}>COMMUNITY_PROTOCOL</Text>
        <Text style={styles.protocolText}>
          COMPETE HARD // RESPECT THE COMMUNITY
        </Text>
      </View>

      {/* RULES */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>COMMUNITY_PROTOCOL</Text>
          <Text style={styles.sectionTitle}>Community Rules</Text>
        </View>

        <Text style={styles.sectionNumber}>01</Text>
      </View>

      <View style={styles.rulesContainer}>
        {communityRules.map((rule) => (
          <View key={rule.number} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={styles.ruleNumberBox}>
                <Text style={styles.ruleNumber}>{rule.number}</Text>
              </View>

              <Text style={styles.ruleTitle}>{rule.title}</Text>
            </View>

            <View style={styles.ruleBody}>
              {rule.paragraphs.map((paragraph, index) => (
                <View
                  key={`${rule.number}-${index}`}
                  style={styles.ruleParagraph}
                >
                  <View style={styles.bullet} />
                  <Text style={styles.ruleText}>{paragraph}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* ENFORCEMENT */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>VIOLATION_RESPONSE</Text>
          <Text style={styles.sectionTitle}>Enforcement</Text>
        </View>

        <Text style={styles.sectionNumber}>02</Text>
      </View>

      <Text style={styles.sectionDescription}>
        Consequences depend on the severity and frequency of the violation.
      </Text>

      <View style={styles.enforcementContainer}>
        {enforcementLevels.map((level) => (
          <View key={level.number} style={styles.enforcementRow}>
            <View style={styles.enforcementNumberContainer}>
              <Text style={styles.enforcementNumber}>{level.number}</Text>
            </View>

            <View style={styles.enforcementContent}>
              <Text style={styles.enforcementTitle}>{level.title}</Text>

              <Text style={styles.enforcementDescription}>
                {level.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.enforcementNotice}>
        <Text style={styles.noticeLabel}>IMPORTANT</Text>

        <Text style={styles.noticeText}>
          Outrise administrators may skip earlier enforcement steps when a
          violation is sufficiently serious. A user does not need to receive
          three warnings before being suspended or banned.
        </Text>
      </View>

      {/* REPORTING */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>SAFETY_SYSTEM</Text>
          <Text style={styles.sectionTitle}>Reporting</Text>
        </View>

        <Text style={styles.sectionNumber}>03</Text>
      </View>

      <View style={styles.reportingCard}>
        <View style={styles.reportingStatus}>
          <View style={styles.reportingDot} />

          <Text style={styles.reportingStatusText}>
            REPORTING_SYSTEM // ACTIVE
          </Text>
        </View>

        <Text style={styles.reportingText}>
          You can report inappropriate profiles and messages using their
          reporting controls. For other concerns, use Report an Issue in the
          app.
        </Text>

        <Text style={styles.reportingText}>
          Admins review reports and may take action when these rules are
          violated. You can also block a user to prevent further contact.
        </Text>
      </View>

      <View style={styles.evolutionNotice}>
        <Text style={styles.evolutionText}>
          These rules may evolve as Outrise and its community grow.
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />

        <Text style={styles.footerText}>OUTRISE // COMMUNITY_PROTOCOL</Text>

        <View style={styles.footerLine} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 10,
  },

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
    marginBottom: 20,
  },

  title: {
    fontFamily: Fonts.display,
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
    maxWidth: "95%",
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

  protocol: {
    padding: 15,
    marginBottom: 30,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  protocolLabel: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  protocolText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
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
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "800",
  },

  sectionNumber: {
    fontFamily: Fonts.display,
    color: Colors.dark.borderStrong,
    fontSize: 20,
    fontWeight: "900",
  },

  sectionDescription: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 12,
  },

  rulesContainer: {
    gap: 8,
    marginBottom: 31,
  },

  ruleCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
  },

  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  ruleNumberBox: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  ruleNumber: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
  },

  ruleTitle: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  ruleBody: {
    gap: 9,
  },

  ruleParagraph: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  bullet: {
    width: 3,
    height: 3,
    marginTop: 7,
    backgroundColor: Colors.dark.textTechnical,
  },

  ruleText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },

  enforcementContainer: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },

  enforcementRow: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },

  enforcementNumberContainer: {
    width: 34,
    paddingTop: 2,
  },

  enforcementNumber: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
  },

  enforcementContent: {
    flex: 1,
  },

  enforcementTitle: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 5,
  },

  enforcementDescription: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    lineHeight: 18,
  },

  enforcementNotice: {
    marginTop: 9,
    marginBottom: 31,
    padding: 15,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  noticeLabel: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 7,
  },

  noticeText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },

  reportingCard: {
    padding: 16,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 11,
  },

  reportingStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 2,
  },

  reportingDot: {
    width: 5,
    height: 5,
    backgroundColor: Colors.dark.accent,
  },

  reportingStatusText: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  reportingText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },

  evolutionNotice: {
    marginTop: 12,
    paddingHorizontal: 4,
  },

  evolutionText: {
    color: Colors.dark.textDim,
    fontSize: 10,
    lineHeight: 16,
    fontStyle: "italic",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 36,
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
    letterSpacing: 1.4,
  },
});
