import { StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { Colors, Fonts } from "@/constants/theme";
import type { SystemMessage } from "@/api/system-messages";

export function SystemMessageCard({
  message,
  showUnread = true,
}: {
  message: SystemMessage;
  showUnread?: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.sender}>OUTRISE // ANNOUNCEMENT</Text>
        {showUnread && !message.read && (
          <Text style={styles.newLabel}>NEW</Text>
        )}
      </View>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.date}>
        {new Date(message.createdAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </Text>
      <Text style={styles.body}>{message.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginBottom: 14,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sender: {
    color: Colors.dark.textTechnical,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  newLabel: { color: Colors.dark.accent, fontSize: 11, fontWeight: "800" },
  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  date: { color: Colors.dark.textMuted, fontSize: 12 },
  body: { color: Colors.dark.textSecondary, fontSize: 15, lineHeight: 23 },
});
