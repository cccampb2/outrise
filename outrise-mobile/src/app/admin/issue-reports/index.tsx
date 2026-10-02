import { hasAdminAccess } from "@/constants/user-roles";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { AdminChoices, AdminField, adminAchievementStyles as styles } from "@/components/admin-achievement-ui";
import { getIssueReports, issueReportStatuses } from "@/api/issue-reports";
import { ApiError } from "@/api/client";
import type { RootState } from "@/store/store";

export default function IssueReportsScreen() {
  const admin = useSelector((state: RootState) => state.auth.user);
  const isAdmin = hasAdminAccess(admin?.role);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("open");
  const query = useInfiniteQuery({
    queryKey: ["issue-reports", admin?.id, appliedSearch, status],
    queryFn: ({ pageParam }) => getIssueReports(pageParam, appliedSearch, status),
    initialPageParam: 1,
    getNextPageParam: (page) => page.pagination.page < page.pagination.totalPages ? page.pagination.page + 1 : undefined,
    enabled: isAdmin,
    refetchInterval: 30000,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (isAdmin) void refetch(); }, [isAdmin, refetch]));
  return (
    <Screen scroll>
      <View style={styles.page}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.action}>← BACK</Text></Pressable>
        {!isAdmin ? <Text style={styles.error}>Admin access required.</Text> : <>
          <Text style={styles.title}>Issue Reports</Text>
          <Text style={styles.text}>Shared inbox for all OUTRISE administrators.</Text>
          <AdminField label="Search by email or subject" value={search} onChange={setSearch} />
          <Pressable accessibilityRole="button" onPress={() => setAppliedSearch(search.trim())} style={styles.button}><Text style={styles.action}>SEARCH</Text></Pressable>
          <AdminChoices label="Report status" options={["all", ...issueReportStatuses]} value={status} onChange={setStatus} />
          <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => { void refetch(); }} style={styles.button}><Text style={styles.action}>{query.isRefetching ? "REFRESHING..." : "REFRESH INBOX"}</Text></Pressable>
          {query.isPending && <ActivityIndicator />}
          {query.isError && <Text style={styles.error}>{query.error instanceof ApiError ? query.error.getDisplayMessage() : "Unable to load reports."}</Text>}
          {query.data?.pages[0]?.pagination.total === 0 && <Text style={styles.text}>No reports with this status.</Text>}
          {query.data?.pages.flatMap((page) => page.reports).map((report) => (
            <Pressable key={report._id} accessibilityRole="button" onPress={() => router.push({ pathname: "/admin/issue-reports/[reportId]", params: { reportId: report._id } })} style={styles.card}>
              <Text style={styles.cardTitle}>{report.subject}</Text>
              <Text style={styles.text}>{report.email}</Text>
              <Text style={styles.text} numberOfLines={3}>{report.message}</Text>
              <Text style={styles.text}>{report.status.replaceAll("_", " ").toUpperCase()} · {new Date(report.createdAt).toLocaleString()}</Text>
              {report.reviewer && <Text style={styles.text}>Reviewer: {report.reviewer.username}</Text>}
              {report.resolvedBy && <Text style={styles.text}>Resolved by: {report.resolvedBy.username}</Text>}
              <Text style={styles.action}>OPEN REPORT →</Text>
            </Pressable>
          ))}
          {query.hasNextPage && <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => { void query.fetchNextPage(); }} style={styles.button}><Text style={styles.action}>{query.isFetchingNextPage ? "LOADING..." : "VIEW MORE"}</Text></Pressable>}
        </>}
      </View>
    </Screen>
  );
}
