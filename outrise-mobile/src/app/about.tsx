import { LegalLinks } from "@/components/legal-acceptance";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen } from "@/components/screen";
import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { Colors, Fonts } from "@/constants/theme";
const contactEmail = "support@outrisefitness.com";

export default function AboutScreen() {
  const [emailError, setEmailError] = useState(false);
  const openEmail = async () => {
    try {
      await Linking.openURL(
        `mailto:${contactEmail}?subject=${encodeURIComponent("Hello from an Outrise member")}`,
      );
      setEmailError(false);
    } catch {
      setEmailError(true);
    }
  };
  return (
    <Screen scroll bottomInSet={28}>
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/profile")
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={18} color={Colors.dark.text} />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>
        <BrandHeader label="ABOUT" />
        <LegalLinks />
        <View style={styles.hero}>
          <View style={styles.rule} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>RISE BEYOND.</Text>
            <Text style={styles.subtitle}>
              Built for progress. Powered by community.
            </Text>
          </View>
        </View>
        <Text style={styles.body}>
          Outrise brings workout tracking, personal milestones, and faction
          competition together. Train with purpose, celebrate your progress, and
          find people who push you to get better.
        </Text>
        <View style={styles.card}>
          <Text style={styles.label}>BEHIND OUTRISE</Text>
          <Text style={styles.name}>Outrise Studio</Text>
          <Text style={styles.role}>FITNESS · PROGRESS · COMMUNITY</Text>
          <Text style={styles.body}>
            Outrise Studio builds tools for personal progress and friendly
            competition, with room to keep growing alongside the community.
          </Text>
          <Text style={styles.body}>
            Thanks for being part of it. Your ideas and feedback help shape what
            comes next.
          </Text>
        </View>
        <View style={styles.contact}>
          <Text style={styles.label}>CONTACT OUTRISE STUDIO</Text>
          <Text style={styles.body}>
            Have a question or just want to say hello?
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Email Outrise Studio"
            onPress={() => {
              void openEmail();
            }}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={Colors.dark.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.buttonText}>CONTACT OUTRISE STUDIO</Text>
              <Text selectable style={styles.email}>
                {contactEmail}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward-outline"
              size={18}
              color={Colors.dark.textMuted}
            />
          </Pressable>
          {emailError && (
            <Text accessibilityRole="alert" style={styles.error}>
              Couldn’t open an email app. You can email {contactEmail} directly.
            </Text>
          )}
          <View style={styles.links}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/report-issue")}
              style={styles.link}
            >
              <Text style={styles.linkText}>REPORT AN ISSUE →</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/suggest-feature")}
              style={styles.link}
            >
              <Text style={styles.linkText}>SUGGEST A FEATURE →</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.footer}>
          OUTRISE // VERSION {Constants.expoConfig?.version ?? "—"}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, gap: 22 },
  back: {
    minHeight: 44,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  backText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: { opacity: 0.65 },
  hero: { flexDirection: "row", gap: 14, alignItems: "stretch", marginTop: 4 },
  rule: { width: 3, backgroundColor: Colors.dark.accent },
  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  body: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 23 },
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    padding: 20,
    gap: 15,
  },
  label: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  name: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: "700",
  },
  role: { color: Colors.dark.textSecondary, fontSize: 10, letterSpacing: 0.8 },
  contact: { gap: 14 },
  contactButton: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  email: { color: Colors.dark.textSecondary, fontSize: 12, marginTop: 5 },
  error: { color: Colors.dark.danger, fontSize: 12, lineHeight: 18 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  footer: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 8,
  },
});
