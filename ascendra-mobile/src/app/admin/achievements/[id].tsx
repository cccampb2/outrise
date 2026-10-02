import { AppText as Text } from "@/components/app-text";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { getAdminAchievement } from "@/api/admin-achievements";
import { Screen } from "@/components/screen";
import { AdminAchievementForm } from "@/components/admin-achievement-form";
import { adminAchievementStyles as styles } from "@/components/admin-achievement-ui";

export default function EditAchievementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useSelector((state: { auth: { user: { role: string } | null } }) => state.auth.user?.role === "admin");
  const validId = typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  const query = useQuery({ queryKey: ["admin-achievement", id], queryFn: () => getAdminAchievement(id), enabled: isAdmin && validId });
  if (isAdmin && validId && query.data) return <AdminAchievementForm key={id} achievement={query.data.achievement} />;
  return <Screen><View style={styles.page}><Pressable style={styles.button} onPress={() => router.back()}><Text style={styles.action}>← BACK</Text></Pressable>
    {!isAdmin ? <Text style={styles.error}>Admin access required.</Text> : !validId ? <Text style={styles.error}>Invalid achievement.</Text> : query.isPending ? <ActivityIndicator /> : <Pressable style={styles.button} onPress={() => { void query.refetch(); }}><Text style={styles.error}>Unable to load achievement. Tap to retry.</Text></Pressable>}
  </View></Screen>;
}
