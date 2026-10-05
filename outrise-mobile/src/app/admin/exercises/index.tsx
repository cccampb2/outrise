import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getExercises,
  setExerciseArchived,
  type Exercise,
} from "@/api/exercises";
import { AppText as Text } from "@/components/app-text";
import {
  AdminField,
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
  invalidateExerciseQueries,
} from "@/components/admin-content-ui";

export default function AdminExercises() {
  const isAdmin = useAdminAccess();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"active" | "archived">("active");
  const query = useQuery({
    queryKey: ["admin-exercises", page, status, search],
    queryFn: () =>
      getExercises({
        page,
        limit: 20,
        status,
        search: search.trim() || undefined,
      }),
    enabled: isAdmin,
  });
  const mutation = useMutation({
    mutationFn: (exercise: Exercise) =>
      setExerciseArchived(exercise._id, exercise.isActive),
    onSuccess: async () => {
      setPage(1);
      await invalidateExerciseQueries(client);
    },
  });
  function changeStatus(exercise: Exercise) {
    if (mutation.isPending) return;
    if (!exercise.isActive) return mutation.mutate(exercise);
    Alert.alert(
      "Archive exercise?",
      `${exercise.name} will no longer be available for new selections. Existing workout records are retained.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => mutation.mutate(exercise),
        },
      ],
    );
  }
  return (
    <AdminPage title="Exercise library">
      <AdminButton
        label="+ NEW EXERCISE"
        onPress={() => router.push("/admin/exercises/create")}
      />
      <AdminField
        label="SEARCH EXERCISES"
        value={search}
        onChange={(value) => {
          setSearch(value.slice(0, 100));
          setPage(1);
        }}
      />
      <AdminChoices
        label="AVAILABILITY"
        options={["active", "archived"] as const}
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />
      <AdminQueryState query={query} />
      {mutation.isError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {adminError(mutation.error)}
        </Text>
      )}
      {!query.isPending &&
        !query.isError &&
        query.data?.exercises.length === 0 && (
          <Text style={styles.text}>No exercises match this view.</Text>
        )}
      {query.data?.exercises.map((exercise) => (
        <View key={exercise._id} style={styles.card}>
          <Text style={styles.cardTitle}>{exercise.name}</Text>
          <Text style={styles.text}>
            {exercise.category.toUpperCase()} ·{" "}
            {exercise.measurementType.replaceAll("_", " ")} ·{" "}
            {exercise.baseXP ?? "—"} XP
          </Text>
          <Text style={styles.text}>{exercise.description}</Text>
          <View style={styles.choices}>
            {exercise.isActive && (
              <AdminButton
                label="EDIT"
                disabled={mutation.isPending}
                onPress={() =>
                  router.push({
                    pathname: "/admin/exercises/[id]",
                    params: { id: exercise._id },
                  })
                }
              />
            )}
            <AdminButton
              label={exercise.isActive ? "ARCHIVE" : "RESTORE"}
              destructive={exercise.isActive}
              disabled={mutation.isPending}
              onPress={() => changeStatus(exercise)}
            />
          </View>
        </View>
      ))}
      {query.data && (
        <AdminPagination
          page={page}
          totalPages={query.data.pagination.totalPages}
          busy={query.isFetching || mutation.isPending}
          onChange={setPage}
        />
      )}
    </AdminPage>
  );
}
