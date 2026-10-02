import { AppText as Text } from "@/components/app-text";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Screen } from "@/components/screen";
import { AdminChoices, AdminField, adminAchievementStyles as styles } from "@/components/admin-achievement-ui";
import { getAdminAchievements, setAdminAchievementStatus } from "@/api/admin-achievements";
import { ApiError } from "@/api/client";

export default function AdminAchievementsScreen() {
  const isAdmin = useSelector((state: { auth: { user: { role: string } | null } }) => state.auth.user?.role === "admin");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const client = useQueryClient();
  const query = useInfiniteQuery({ queryKey: ["admin-achievements", appliedSearch, status], queryFn: ({ pageParam }) => getAdminAchievements(pageParam, appliedSearch, status), initialPageParam: 1, getNextPageParam: (page) => page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined, enabled: isAdmin });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (isAdmin) void refetch(); }, [isAdmin, refetch]));
  const toggle = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => setAdminAchievementStatus(id, active), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["admin-achievements"] }); await client.invalidateQueries({ queryKey: ["admin-achievement"] }); } });
  return <Screen scroll><View style={styles.page}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.action}>← BACK</Text></Pressable>
    {!isAdmin ? <Text style={styles.error}>Admin access required.</Text> : <>
      <Text style={styles.title}>Achievements</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push("/admin/achievements/create")} style={styles.button}><Text style={styles.action}>+ CREATE ACHIEVEMENT</Text></Pressable>
      <AdminField label="Search by name" value={search} onChange={setSearch} />
      <Pressable accessibilityRole="button" onPress={() => setAppliedSearch(search.trim())} style={styles.button}><Text style={styles.action}>SEARCH</Text></Pressable>
      <AdminChoices label="Status" options={["all", "active", "inactive"]} value={status} onChange={setStatus} />
      {query.isPending && <ActivityIndicator />}
      {query.isError && <Pressable onPress={() => { void refetch(); }} style={styles.button}><Text style={styles.error}>Unable to load. Tap to retry.</Text></Pressable>}
      {query.data?.pages[0]?.pagination.total === 0 && <Text style={styles.text}>No achievements found.</Text>}
      {query.data?.pages.flatMap((page) => page.achievements).map((achievement) => <View key={achievement._id} style={styles.card}>
        <Text style={styles.cardTitle}>{achievement.name}</Text><Text style={styles.text}>{achievement.description}</Text>
        <Text style={styles.text}>{achievement.requirementType.replaceAll("_", " ")} · Target {achievement.requirement.value} · {achievement.xpReward} XP</Text>
        <Text style={styles.text}>{achievement.isActive ? "ACTIVE" : "INACTIVE"}{achievement.isSecret ? " · SECRET" : ""}</Text>
        <View style={styles.choices}><Pressable style={styles.button} onPress={() => router.push({ pathname: "/admin/achievements/[id]", params: { id: achievement._id } })}><Text style={styles.action}>EDIT</Text></Pressable>
        <Pressable style={styles.button} disabled={toggle.isPending} onPress={() => toggle.mutate({ id: achievement._id, active: !achievement.isActive })}><Text style={styles.action}>{achievement.isActive ? "DEACTIVATE" : "ACTIVATE"}</Text></Pressable></View>
      </View>)}
      {toggle.isError && <Text style={styles.error}>{toggle.error instanceof ApiError ? toggle.error.getDisplayMessage() : "Unable to update status."}</Text>}
      {query.hasNextPage && <Pressable style={styles.button} disabled={query.isFetching} onPress={() => { void query.fetchNextPage(); }}><Text style={styles.action}>{query.isFetching ? "LOADING..." : "VIEW MORE"}</Text></Pressable>}
    </>}
  </View></Screen>;
}
