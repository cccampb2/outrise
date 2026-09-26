import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

type ActivityRowProps = {
  name: string;

  date: string;

  xp: number;

  isLast?: boolean;
};

export function ActivityRow({
  name,

  date,

  xp,

  isLast = false,
}: ActivityRowProps) {
  return (
    <View style={[styles.row, isLast && styles.lastRow]}>
      <View style={styles.activityInfo}>
        <View style={styles.node} />

        <View style={styles.textContent}>
          <Text style={styles.name}>{name}</Text>

          <Text style={styles.date}>{date}</Text>
        </View>
      </View>

      <View style={styles.xpContainer}>
        <Text style={styles.xpLabel}>XP_GAIN</Text>

        <Text style={styles.xp}>+{xp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingVertical: 14,

    paddingHorizontal: 16,

    borderBottomWidth: 1,

    borderBottomColor: Colors.dark.borderSubtle,
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  activityInfo: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",
  },

  node: {
    width: 6,

    height: 6,

    marginRight: 12,

    backgroundColor: Colors.dark.echelon,

    transform: [{ rotate: "45deg" }],
  },

  textContent: {
    flex: 1,
  },

  name: {
    color: Colors.dark.text,

    fontSize: 14,

    fontWeight: "700",
  },

  date: {
    color: Colors.dark.textMuted,

    fontSize: 11,

    fontWeight: "600",

    letterSpacing: 0.4,

    marginTop: 5,
  },

  xpContainer: {
    alignItems: "flex-end",

    marginLeft: 16,
  },

  xpLabel: {
    color: Colors.dark.textDim,

    fontSize: 8,

    fontWeight: "700",

    letterSpacing: 1,

    marginBottom: 3,
  },

  xp: {
    color: Colors.dark.echelon,

    fontSize: 14,

    fontWeight: "800",
  },
});
