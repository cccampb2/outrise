import { MondayDatePicker } from "@/components/monday-date-picker";
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWotwTemplate, scheduleWotw } from "@/api/admin-workout-of-the-week";
import { AppText as Text } from "@/components/app-text";
import { adminAchievementStyles as styles } from "@/components/admin-achievement-ui";
import {
  AdminPage,
  AdminButton,
  AdminQueryState,
  useAdminAccess,
  adminError,
  invalidateWotwQueries,
  formatWotwDate,
} from "@/components/admin-content-ui";

function mondayWindow(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const start = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== value ||
    start.getUTCDay() !== 1
  )
    return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: value, end: end.toISOString().slice(0, 10) };
}

export default function ScheduleWotw() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const isAdmin = useAdminAccess();
  const client = useQueryClient();
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin-wotw", "template", templateId],
    queryFn: () => getWotwTemplate(templateId),
    enabled: isAdmin && Boolean(templateId),
  });
  const mutation = useMutation({
    mutationFn: (startDate: string) => scheduleWotw(templateId, startDate),
    onSuccess: async () => {
      await invalidateWotwQueries(client);
    },
  });
  const window = mondayWindow(date.trim());
  const unavailableExercises =
    query.data?.workoutOfTheWeek.exercises.some(
      (entry) => !entry.exercise?.isActive,
    ) ?? false;
  function submit() {
    if (mutation.isPending) return;
    setError("");
    if (unavailableExercises)
      return setError(
        "Edit this template to replace unavailable exercises before scheduling.",
      );
    if (!window) return setError("Choose a Monday from the calendar.");
    mutation.mutate(window.start);
  }
  return (
    <AdminPage title="Schedule WOTW" busy={mutation.isPending}>
      {!templateId ? (
        <Text style={styles.error}>
          Choose a template from the WOTW template list first.
        </Text>
      ) : (
        <>
          <AdminQueryState query={query} />
          {mutation.isSuccess && mutation.data ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Challenge scheduled</Text>
              <Text style={styles.text}>{mutation.data.occurrence.name}</Text>
              <Text style={styles.text}>
                {formatWotwDate(mutation.data.occurrence.startsAt)} →{" "}
                {formatWotwDate(mutation.data.occurrence.endsAt)}
              </Text>
              <AdminButton
                label="DONE →"
                onPress={() => router.replace("/admin/wotw")}
              />
            </View>
          ) : (
            query.data && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {query.data.workoutOfTheWeek.name}
                  </Text>
                  <Text style={styles.text}>
                    {query.data.workoutOfTheWeek.difficulty.replaceAll(
                      "_",
                      " ",
                    )}{" "}
                    · {query.data.workoutOfTheWeek.bonusXP} bonus XP
                  </Text>
                  <Text style={styles.text}>
                    {query.data.workoutOfTheWeek.exercises.length} exercises
                  </Text>
                  {unavailableExercises && (
                    <Text style={styles.error}>
                      Edit this template to replace unavailable exercises before
                      scheduling.
                    </Text>
                  )}
                  <Text style={styles.text}>
                    Choose a Monday. The challenge runs until the following
                    Monday at midnight, New York time.
                  </Text>
                  <MondayDatePicker
                    value={date}
                    disabled={mutation.isPending}
                    onChange={(value) => {
                      setDate(value);
                      setError("");
                      mutation.reset();
                    }}
                  />
                  {window && (
                    <Text style={styles.text}>
                      Week: {window.start} → {window.end}
                    </Text>
                  )}
                </View>
                <Text style={styles.text}>
                  A current or future week can have one challenge. The same
                  template cannot be used in consecutive weeks. Check the
                  Schedule tab for existing selections.
                </Text>
                {(error || mutation.isError) && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error || adminError(mutation.error)}
                  </Text>
                )}
                <AdminButton
                  label={
                    mutation.isPending ? "SCHEDULING..." : "CONFIRM SCHEDULE"
                  }
                  disabled={mutation.isPending || unavailableExercises}
                  onPress={submit}
                />
              </>
            )
          )}
        </>
      )}
    </AdminPage>
  );
}
