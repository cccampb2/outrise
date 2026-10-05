import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
import { AppText } from "@/components/app-text";
import { Colors } from "@/constants/theme";

const staffRoles = {
  owner: { label: "Owner", icon: "crown", color: "#E9C76A" },
  admin: { label: "Admin", icon: "shield-account", color: "#91B9E8" },
  moderator: { label: "Moderator", icon: "shield-check", color: "#89C9B7" },
} as const;

export function UserRoleBadge({
  role,
  showLabel = false,
}: {
  role?: string | null;
  showLabel?: boolean;
}) {
  if (role !== "owner" && role !== "admin" && role !== "moderator") return null;
  const badge = staffRoles[role];

  return (
    <View
      accessible
      accessibilityLabel={`${badge.label} role`}
      style={[styles.badge, showLabel && styles.labeledBadge]}
    >
      <MaterialCommunityIcons
        name={badge.icon}
        size={showLabel ? 16 : 15}
        color={badge.color}
        accessible={false}
      />
      {showLabel && (
        <AppText
          style={[styles.label, { color: badge.color }]}
          numberOfLines={1}
        >
          {badge.label.toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

export function UserRoleName({
  username,
  role,
  style,
}: {
  username: string;
  role?: string | null;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.nameRow}>
      <AppText style={[style, styles.name]} numberOfLines={1}>
        {username}
      </AppText>
      <UserRoleBadge role={role} />
    </View>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  name: { flexShrink: 1 },
  badge: { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  labeledBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 4,
  },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
});
