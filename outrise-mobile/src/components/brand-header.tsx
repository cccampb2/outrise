import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/app-text";
import { Colors } from "@/constants/theme";

type BrandHeaderProps = {
  label: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function BrandHeader({
  label,
  accentColor = Colors.dark.accent,
  style,
}: BrandHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: accentColor }]} />
      <AppText style={styles.label} numberOfLines={1}>
        OUTRISE // {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  label: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    flexShrink: 1,
  },
});
