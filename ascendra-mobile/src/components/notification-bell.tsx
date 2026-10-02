import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useNotificationCount } from "@/hooks/use-notifications";
import { Colors } from "@/constants/theme";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export function NotificationBell({ userId }: { userId?: string }) {
  const signedInUserId = useSelector((state: RootState) => state.auth.user?.id);
  const unreadCount = useNotificationCount(userId ?? signedInUserId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Notifications, ${unreadCount} unread`}
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.65 }]}
    >
      <Ionicons
        name="notifications-outline"
        size={23}
        color={Colors.dark.text}
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.count}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  count: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
});
