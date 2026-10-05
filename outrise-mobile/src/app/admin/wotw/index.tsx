import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWotwTemplates,
  getWotwSchedule,
  setWotwArchived,
  type WotwTemplate,
} from "@/api/admin-workout-of-the-week";
import type { WorkoutOfTheWeekStatus } from "@/api/workout-of-the-week";
import { AppText as Text } from "@/components/app-text";
import {
  AdminChoices,
  adminAchievementStyles as styles,
} from "@/components/admin-achievement-ui";
import {
  AdminPage,
  AdminButton,
  AdminQueryState,
  AdminPagination,
  useAdminAccess,
  adminError,
  invalidateWotwQueries,
  formatWotwDate,
} from "@/components/admin-content-ui";

export default function AdminWotw() {
  const isAdmin = useAdminAccess();
  const client = useQueryClient();
  const [tab, setTab] = useState<"templates" | "schedule">("templates");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [weekStatus, setWeekStatus] = useState<WorkoutOfTheWeekStatus | "all">(
    "all",
  );
  const templates = useQuery({
    queryKey: ["admin-wotw", "templates", status, page],
    queryFn: () => getWotwTemplates(page, status),
    enabled: isAdmin && tab === "templates",
  });
  const schedule = useQuery({
    queryKey: ["admin-wotw", "schedule", weekStatus, page],
    queryFn: () => getWotwSchedule(page, weekStatus),
    enabled: isAdmin && tab === "schedule",
  });
  const mutation = useMutation({
    mutationFn: (template: WotwTemplate) =>
      setWotwArchived(template._id, template.isActive),
    onSuccess: async () => {
      setPage(1);
      await invalidateWotwQueries(client);
    },
  });
  function changeStatus(template: WotwTemplate) {
    if (mutation.isPending) return;
    if (!template.isActive) return mutation.mutate(template);
    Alert.alert(
      "Archive template?",
      `${template.name} will be removed from the random selection pool. Already scheduled challenges stay unchanged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => mutation.mutate(template),
        },
      ],
    );
  }
  return (
    <AdminPage title="Workout of the Week">
      <AdminButton
        label="+ NEW TEMPLATE"
        onPress={() => router.push("/admin/wotw/create")}
      />
      <AdminChoices
        label="MANAGE"
        options={["templates", "schedule"] as const}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setPage(1);
        }}
      />
      {mutation.isError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {adminError(mutation.error)}
        </Text>
      )}
      {tab === "templates" ? (
        <>
          <Text style={styles.text}>
            Active templates can be chosen randomly when a week has no scheduled
            challenge. Choose Schedule to reserve a specific week.
          </Text>
          <AdminChoices
            label="TEMPLATE AVAILABILITY"
            options={["active", "archived"] as const}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <AdminQueryState query={templates} />
          {!templates.isPending &&
            !templates.isError &&
            templates.data?.workoutOfTheWeekTemplates.length === 0 && (
              <Text style={styles.text}>
                No templates in this view. Create a template to get started.
              </Text>
            )}
          {templates.data?.workoutOfTheWeekTemplates.map((template) => (
            <View key={template._id} style={styles.card}>
              <Text style={styles.cardTitle}>{template.name}</Text>
              <Text style={styles.text}>
                {template.difficulty.replaceAll("_", " ")} · {template.bonusXP}{" "}
                bonus XP · {template.exercises.length} exercises
              </Text>
              {template.description ? (
                <Text style={styles.text}>{template.description}</Text>
              ) : null}
              <View style={styles.choices}>
                {template.isActive && (
                  <>
                    <AdminButton
                      label="EDIT"
                      disabled={mutation.isPending}
                      onPress={() =>
                        router.push({
                          pathname: "/admin/wotw/[id]",
                          params: { id: template._id },
                        })
                      }
                    />
                    <AdminButton
                      label="SCHEDULE"
                      disabled={mutation.isPending}
                      onPress={() =>
                        router.push({
                          pathname: "/admin/wotw/schedule",
                          params: { templateId: template._id },
                        })
                      }
                    />
                  </>
                )}
                <AdminButton
                  label={template.isActive ? "ARCHIVE" : "RESTORE"}
                  destructive={template.isActive}
                  disabled={mutation.isPending}
                  onPress={() => changeStatus(template)}
                />
              </View>
            </View>
          ))}
          {templates.data && (
            <AdminPagination
              page={page}
              totalPages={templates.data.pagination.totalPages}
              busy={templates.isFetching || mutation.isPending}
              onChange={setPage}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.text}>
            Weeks begin Monday at midnight in New York. An unscheduled current
            week is filled automatically. Existing selections cannot be replaced
            here.
          </Text>
          <AdminChoices
            label="WEEK STATUS"
            options={["all", "upcoming", "active", "completed"] as const}
            value={weekStatus}
            onChange={(value) => {
              setWeekStatus(value);
              setPage(1);
            }}
          />
          <AdminButton
            label={schedule.isFetching ? "REFRESHING..." : "REFRESH SCHEDULE"}
            disabled={schedule.isFetching}
            onPress={() => {
              void schedule.refetch();
            }}
          />
          <AdminQueryState query={schedule} />
          {!schedule.isPending &&
            !schedule.isError &&
            schedule.data?.occurrences.length === 0 && (
              <Text style={styles.text}>
                No scheduled challenges in this view.
              </Text>
            )}
          {schedule.data?.occurrences.map((week) => (
            <View key={week._id} style={styles.card}>
              <Text style={styles.cardTitle}>{week.name}</Text>
              <Text style={styles.text}>
                {formatWotwDate(week.startsAt)} → {formatWotwDate(week.endsAt)}
              </Text>
              <Text style={styles.text}>
                {week.status.toUpperCase()} ·{" "}
                {week.selectionSource === "admin"
                  ? "Admin selected"
                  : "Random selection"}
              </Text>
              <Text style={styles.text}>
                {week.difficulty.replaceAll("_", " ")} · {week.bonusXP} bonus XP
                · {week.exercises.length} exercises
              </Text>
            </View>
          ))}
          {schedule.data && (
            <AdminPagination
              page={page}
              totalPages={schedule.data.pagination.totalPages}
              busy={schedule.isFetching}
              onChange={setPage}
            />
          )}
        </>
      )}
    </AdminPage>
  );
}
