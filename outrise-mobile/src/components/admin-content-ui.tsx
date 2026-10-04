import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import type { QueryClient } from "@tanstack/react-query";
import type { RootState } from "@/store/store";
import { hasAdminAccess } from "@/constants/user-roles";
import { ApiError } from "@/api/client";
import { AppText as Text } from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { adminAchievementStyles as styles } from "./admin-achievement-ui";

export function useAdminAccess() {
  return useSelector((state: RootState) => hasAdminAccess(state.auth.user?.role));
}
export function adminError(error: unknown) {
  return error instanceof ApiError ? error.getDisplayMessage()
    : error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
export function AdminButton({ label, onPress, disabled = false, destructive = false }: {
  label: string; onPress: () => void; disabled?: boolean; destructive?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.5 }]}>
    <Text style={[styles.action, destructive && { color: Colors.dark.danger }]}>{label}</Text>
  </Pressable>;
}
export function AdminPage({ title, children, busy = false }: { title: string; children: ReactNode; busy?: boolean }) {
  const isAdmin = useAdminAccess();
  return <Screen scroll keyboardAvoiding bottomInSet={24}><View style={styles.page}>
    <AdminButton label="← BACK" disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/admin")} />
    <BrandHeader label="ADMINISTRATION" />
    <Text style={styles.title}>{title}</Text>
    {isAdmin ? children : <Text style={styles.error}>Admin access required.</Text>}
  </View></Screen>;
}
export function AdminQueryState({ query }: { query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown } }) {
  if (query.isPending) return <ActivityIndicator color={Colors.dark.accent} />;
  if (query.isError) return <View style={styles.card}>
    <Text accessibilityRole="alert" style={styles.error}>{adminError(query.error)}</Text>
    <AdminButton label="RETRY" onPress={() => { void query.refetch(); }} />
  </View>;
  return null;
}
export function AdminPagination({ page, totalPages, busy, onChange }: {
  page: number; totalPages: number; busy: boolean; onChange: (page: number) => void;
}) {
  return <View style={styles.card}>
    <Text style={styles.text}>Page {page} of {Math.max(totalPages, 1)}</Text>
    <View style={styles.choices}>
      <AdminButton label="← PREVIOUS" disabled={busy || page <= 1} onPress={() => onChange(page - 1)} />
      <AdminButton label="NEXT →" disabled={busy || page >= totalPages} onPress={() => onChange(page + 1)} />
    </View>
  </View>;
}
export async function invalidateExerciseQueries(client: QueryClient) {
  await Promise.all(["exercises", "exercise", "admin-exercises", "admin-exercise", "verification-exercises", "workout", "admin-wotw"]
    .map((key) => client.invalidateQueries({ queryKey: [key] })));
}
export async function invalidateWotwQueries(client: QueryClient) {
  await Promise.all(["admin-wotw", "workout-of-the-week"]
    .map((key) => client.invalidateQueries({ queryKey: [key] })));
}
export function formatWotwDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
}
