import { hasAdminAccess } from "@/constants/user-roles";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { adminAchievementStyles as styles } from "@/components/admin-achievement-ui";
import { getIssueReport, updateIssueReport, type IssueReportDetail, type IssueReportStatus, type IssueReportUpdate } from "@/api/issue-reports";
import { ApiError } from "@/api/client";
import type { RootState } from "@/store/store";

export default function IssueReportScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const admin = useSelector((state: RootState) => state.auth.user);
  const isAdmin = hasAdminAccess(admin?.role);
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const queryKey = ["issue-report", reportId, admin?.id];
  const query = useQuery({ queryKey, queryFn: () => getIssueReport(reportId), enabled: isAdmin && Boolean(reportId), refetchInterval: 30000 });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (isAdmin && reportId) void refetch(); }, [isAdmin, reportId, refetch]));
  const mutation = useMutation({
    mutationFn: (data: IssueReportUpdate) => updateIssueReport(reportId, data),
    onSuccess: async ({ report }) => {
      setNote("");
      client.setQueryData<IssueReportDetail>(queryKey, (data) => data ? { ...data, report } : data);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["issue-reports"] }),
        client.invalidateQueries({ queryKey: ["issue-report", reportId] }),
      ]);
    },
  });
  const report = query.data?.report;
  function save(status: IssueReportStatus) {
    if (!report || mutation.isPending) return;
    mutation.mutate({ status, expectedRevision: report.revision, note: note.trim() });
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.action}>← BACK</Text></Pressable>
        {!isAdmin ? <Text style={styles.error}>Admin access required.</Text> : <>
          <Text style={styles.title}>Review report</Text>
          <Pressable accessibilityRole="button" disabled={query.isFetching || mutation.isPending} onPress={() => { void refetch(); }} style={styles.button}><Text style={styles.action}>REFRESH REPORT</Text></Pressable>
          {query.isPending && <ActivityIndicator />}
          {query.isError && <Text style={styles.error}>{query.error instanceof ApiError ? query.error.getDisplayMessage() : "Unable to load report."}</Text>}
          {report && <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{report.subject}</Text>
              <Text selectable style={styles.text}>{report.email}</Text>
              <Text style={styles.text}>{report.status.replaceAll("_", " ").toUpperCase()} · {new Date(report.createdAt).toLocaleString()}</Text>
              <Text selectable style={styles.text}>{report.message}</Text>
              {report.reviewer && <Text style={styles.text}>Reviewer: {report.reviewer.username}</Text>}
              {report.resolvedBy && <Text style={styles.text}>Resolved by {report.resolvedBy.username}{report.resolvedAt ? ` on ${new Date(report.resolvedAt).toLocaleString()}` : ""}</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account with this email</Text>
              <Text style={styles.text}>The reporter supplied this email without signing in. Account ownership has not been verified.</Text>
              {query.data?.account ? <>
                <Text style={styles.text}>{query.data.account.username} · {query.data.account.accountStatus.toUpperCase()}</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/admin/users/[userId]", params: { userId: query.data!.account!._id } })} style={styles.button}><Text style={styles.action}>REVIEW ACCOUNT →</Text></Pressable>
              </> : <Text style={styles.text}>No ASCENDRA account currently matches this email.</Text>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Admin actions</Text>
              <Text style={styles.text}>Internal notes are visible to all admins.</Text>
              <TextInput accessibilityLabel="Internal admin note" placeholder="Add an internal note (optional for status changes)" editable={!mutation.isPending} multiline maxLength={2000} value={note} onChangeText={setNote} style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} />
              <View style={styles.choices}>
                {report.status === "open" && <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => save("in_review")} style={styles.button}><Text style={styles.action}>START REVIEW</Text></Pressable>}
                {report.status !== "resolved" && <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => save("resolved")} style={styles.button}><Text style={styles.action}>RESOLVE REPORT</Text></Pressable>}
                {report.status !== "open" && <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={() => save("open")} style={styles.button}><Text style={styles.action}>{report.status === "resolved" ? "REOPEN REPORT" : "RETURN TO OPEN"}</Text></Pressable>}
                <Pressable accessibilityRole="button" disabled={mutation.isPending || !note.trim()} onPress={() => save(report.status)} style={styles.button}><Text style={styles.action}>SAVE NOTE</Text></Pressable>
              </View>
              {mutation.isPending && <Text style={styles.text}>Saving...</Text>}
              {mutation.isSuccess && <Text style={styles.text}>Report updated.</Text>}
              {mutation.isError && <Text style={styles.error}>{mutation.error instanceof ApiError ? mutation.error.getDisplayMessage() : "Unable to update report."}</Text>}
            </View>
            <Text style={styles.cardTitle}>Internal history</Text>
            {report.history.length === 0 && <Text style={styles.text}>No admin actions yet.</Text>}
            {[...report.history].reverse().map((entry) => <View key={entry._id} style={styles.card}>
              <Text style={styles.text}>{entry.previousStatus === entry.status ? "INTERNAL NOTE" : `${entry.previousStatus.replaceAll("_", " ").toUpperCase()} → ${entry.status.replaceAll("_", " ").toUpperCase()}`}</Text>
              {entry.note && <Text style={styles.text}>{entry.note}</Text>}
              <Text style={styles.text}>{entry.admin?.username ?? "Former administrator"} · {new Date(entry.createdAt).toLocaleString()}</Text>
            </View>)}
          </>}
        </>}
      </View>
    </Screen>
  );
}
