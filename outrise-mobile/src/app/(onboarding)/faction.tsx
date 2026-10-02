import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { StyleSheet, View, Pressable } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";

export default function FactionScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        {/* SYSTEM HEADER */}

        <View style={styles.systemHeader}>
          <BrandHeader label="ONBOARDING" />

          <Text style={styles.stepCode}>STEP_01</Text>
        </View>

        {/* IDENTITY */}

        <View style={styles.content}>
          <Text style={styles.eyebrow}>FACTION_ASSESSMENT</Text>

          <Text style={styles.title}>Find where you belong.</Text>

          <Text style={styles.description}>
            Your answers will determine which Outrise faction best matches you.
          </Text>

          <View style={styles.divider}>
            <View style={styles.dividerAccent} />
          </View>

          {/* INFORMATION */}

          <View style={styles.informationPanel}>
            <View style={styles.hudCornerTL} />
            <View style={styles.hudCornerBR} />

            <View style={styles.informationRow}>
              <Text style={styles.dataLabel}>ASSESSMENT</Text>

              <Text style={styles.dataValue}>PERSONALITY_MATCH</Text>
            </View>

            <View style={styles.informationDivider} />

            <View style={styles.informationRow}>
              <Text style={styles.dataLabel}>RESULT</Text>

              <Text style={styles.dataValue}>FACTION_RECOMMENDATION</Text>
            </View>
          </View>

          {/* ACTION */}

          <Pressable
            onPress={() => router.push("/(onboarding)/assessment")}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <View style={styles.buttonMarker} />

            <Text style={styles.buttonText}>BEGIN_ASSESSMENT</Text>

            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>
        </View>

        {/* FOOTER */}

        <View style={styles.brandFooter}>
          <View style={styles.brandLine} />

          <Text style={styles.brandWordmark}>OUTRISE</Text>

          <View style={styles.brandLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 34,
    paddingBottom: 18,
  },

  /* SYSTEM */

  systemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  stepCode: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  /* CONTENT */

  content: {
    flex: 1,
    justifyContent: "center",
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.8,
    maxWidth: 320,
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 330,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginVertical: 28,
  },

  dividerAccent: {
    position: "absolute",
    left: 0,
    top: -1,
    width: 44,
    height: 2,
    backgroundColor: Colors.dark.accent,
  },

  /* INFORMATION */

  informationPanel: {
    position: "relative",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  hudCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.dark.accent,
  },

  hudCornerBR: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.dark.accent,
  },

  informationRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  dataLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  dataValue: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "right",
  },

  informationDivider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  /* BUTTON */

  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 14,
  },

  buttonPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    transform: [{ scale: 0.99 }],
  },

  buttonMarker: {
    width: 3,
    height: 20,
    backgroundColor: Colors.dark.accent,
  },

  buttonText: {
    flex: 1,
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
    textAlign: "center",
  },

  buttonArrow: {
    color: Colors.dark.accent,
    fontSize: 17,
    fontWeight: "900",
  },

  /* FOOTER */

  brandFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
  },

  brandLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  brandWordmark: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 4,
  },
});
