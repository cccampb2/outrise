import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppText as Text } from "./app-text";
import { Colors } from "@/constants/theme";
export function LegalLinks() {
  return (
    <View style={styles.links}>
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          router.push({ pathname: "/legal", params: { document: "terms" } })
        }
        style={styles.link}
      >
        <Text style={styles.linkText}>TERMS OF USE →</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          router.push({ pathname: "/legal", params: { document: "privacy" } })
        }
        style={styles.link}
      >
        <Text style={styles.linkText}>PRIVACY POLICY →</Text>
      </Pressable>
    </View>
  );
}
export function LegalAcceptance({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.card}>
      <LegalLinks />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel="I am 18 or older, agree to the Terms, acknowledge the Privacy Policy, and understand exercise risks"
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.checked]}>
          <Text style={styles.check}>{checked ? "✓" : ""}</Text>
        </View>
        <Text style={styles.text}>
          I declare that I am 18 or older. I agree to the Terms of Use and
          acknowledge that I have read the Privacy Policy. I understand that
          exercise carries risks, and that XP, rankings, and challenges should
          never take priority over my safety.
        </Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { gap: 10, paddingVertical: 12 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  box: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  check: { color: "#FFFFFF", fontSize: 17 },
  text: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
