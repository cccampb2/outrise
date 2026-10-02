import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { AppText as Text } from "@/components/app-text";
import { Colors, Fonts } from "@/constants/theme";
import type { RootState } from "@/store/store";

export function AccountFlagNotice() {
  const flagged = useSelector((state: RootState) => state.auth.user?.accountStatus === "flagged");
  if (!flagged) return null;
  return (
    <View style={styles.notice}>
      <Text style={styles.title}>ACCOUNT FLAGGED</Text>
      <Text style={styles.text}>
        Your account has been flagged for breaking ASCENDRA community rules.
        Please review the rules. Further violations may result in suspension or a ban.
      </Text>
      <Pressable accessibilityRole="button" onPress={() => router.push("/community-rules")} style={styles.button}>
        <Text style={styles.link}>REVIEW COMMUNITY RULES →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: Colors.dark.backgroundElement, borderWidth: 1, borderColor: "#5E4319", borderLeftWidth: 3, borderLeftColor: Colors.dark.zenith, padding: 14, gap: 8, marginBottom: 16 },
  title: { fontFamily: Fonts.display, color: Colors.dark.zenith, fontSize: 18, fontWeight: "700" },
  text: { color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 44, justifyContent: "center" },
  link: { color: Colors.dark.zenith, fontSize: 11, fontWeight: "700" },
});
