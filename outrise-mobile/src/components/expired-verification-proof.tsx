import { StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { Colors, Fonts } from "@/constants/theme";

export function ExpiredVerificationProof({
  expired,
  pendingExpired = false,
}: {
  expired: boolean;
  pendingExpired?: boolean;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>
        {expired ? "Video expired" : "Video unavailable"}
      </Text>
      <Text style={styles.description}>
        {expired
          ? pendingExpired
            ? "This submission expired without review after 30 days. Its video has been removed. You can submit again."
            : "Verification videos are removed 30 days after review. The review decision and performance record are kept."
          : "The proof video is currently unavailable."}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    padding: 20,
    gap: 8,
    marginBottom: 20,
  },
  title: { fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 20 },
  description: { color: Colors.dark.textMuted, fontSize: 13, lineHeight: 20 },
});
