import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./app-text";
import { Colors } from "@/constants/theme";
export function ExerciseSafety() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>EXERCISE SAFETY</Text>
      <Text style={styles.text}>
        Choose a safe pace, weight, and movement for your abilities. Stop if you
        feel pain or unwell. XP and rankings are never worth an injury.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={styles.toggle}
      >
        <Text style={styles.label}>
          {expanded ? "LESS SAFETY INFORMATION ↑" : "READ SAFETY INFORMATION ↓"}
        </Text>
      </Pressable>
      {expanded && (
        <Text style={styles.text}>
          Exercise instructions and templates are general educational
          information, not medical advice or individualized training advice.
          Exercise carries risks, including serious injury. Seek guidance from a
          qualified healthcare professional when appropriate, especially if you
          have a medical concern. Use suitable equipment, prioritize controlled
          technique, and skip or modify movements you cannot perform safely.
          Challenges and bonus XP are optional. Verification approval does not
          certify that a movement is safe for you.
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  text: { color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 20 },
  toggle: { minHeight: 44, justifyContent: "center" },
  label: { color: Colors.dark.textSecondary, fontSize: 11, fontWeight: "700" },
});
