import { AppText as Text } from "@/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/screen";
import { ProfileAchievements } from "@/components/profile-achievements";
import { Colors } from "@/constants/theme";

export default function AchievementsScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string | string[] }>();
  const id = Array.isArray(userId) ? userId[0] : userId;
  return <Screen scroll>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.text}>← BACK</Text></Pressable></View>
    {id && /^[a-f\d]{24}$/i.test(id) ? <ProfileAchievements userId={id} showAll /> : <Text style={styles.text}>Profile unavailable.</Text>}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  back: { minHeight: 44, justifyContent: "center" },
  text: { color: Colors.dark.text, fontSize: 12, fontWeight: "700" },
});
