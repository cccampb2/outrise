import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getExercises, type Exercise } from "@/api/exercises";
import {
  getWotwTemplate,
  saveWotwTemplate,
  wotwDifficulties,
  type WotwTemplate,
  type WotwTemplateInput,
} from "@/api/admin-workout-of-the-week";
import type { WorkoutTarget } from "@/api/workout-sessions";
import { validateAdminWorkoutTarget } from "@/utils/admin-workout-targets";
import { AppText as Text } from "./app-text";
import { WorkoutExerciseTarget } from "./workouts/workout-exercise-target";
import {
  AdminField,
  AdminChoices,
  adminAchievementStyles as styles,
} from "./admin-achievement-ui";
import {
  AdminPage,
  AdminButton,
  AdminQueryState,
  AdminPagination,
  adminError,
  useAdminAccess,
  invalidateWotwQueries,
} from "./admin-content-ui";

type SelectedExercise = {
  key: string;
  exercise: Exercise | null;
  target: WorkoutTarget;
};

export function AdminWotwEditor({ templateId }: { templateId?: string }) {
  const isAdmin = useAdminAccess();
  const query = useQuery({
    queryKey: ["admin-wotw", "template", templateId],
    queryFn: () => getWotwTemplate(templateId!),
    enabled: isAdmin && Boolean(templateId),
  });
  if (!isAdmin || (templateId && !query.data))
    return (
      <AdminPage title="Edit WOTW template">
        <AdminQueryState query={query} />
      </AdminPage>
    );
  return (
    <AdminWotwForm
      key={templateId ?? "create"}
      template={query.data?.workoutOfTheWeek}
    />
  );
}

function AdminWotwForm({ template }: { template?: WotwTemplate }) {
  const client = useQueryClient();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [difficulty, setDifficulty] = useState<WotwTemplateInput["difficulty"]>(
    template?.difficulty ?? "medium",
  );
  const [bonusXP, setBonusXP] = useState(String(template?.bonusXP ?? 50));
  const [selected, setSelected] = useState<SelectedExercise[]>(
    () =>
      template?.exercises
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((entry, index) => ({
          key: entry._id ?? String(index),
          exercise: entry.exercise,
          target: entry.target,
        })) ?? [],
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const exercises = useQuery({
    queryKey: ["admin-wotw", "exercise-picker", page, search],
    queryFn: () =>
      getExercises({ page, limit: 10, search: search.trim() || undefined }),
  });
  const mutation = useMutation({
    mutationFn: (input: WotwTemplateInput) =>
      saveWotwTemplate(input, template?._id),
    onSuccess: async (result) => {
      await invalidateWotwQueries(client);
      Alert.alert(
        "Template saved",
        result.createdNewTemplate
          ? "Saved as a new template. Existing scheduled weeks keep their original challenge."
          : "Your template is ready for random selection or scheduling.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    },
  });
  function addExercise(exercise: Exercise) {
    setSelected((current) => [
      ...current,
      { key: `${Date.now()}:${Math.random()}`, exercise, target: {} },
    ]);
    setError("");
  }
  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }
  function changeTarget(
    key: string,
    field: keyof WorkoutTarget,
    value: number | undefined,
  ) {
    setSelected((current) =>
      current.map((entry) => {
        if (entry.key !== key) return entry;
        const target = { ...entry.target };
        if (value === undefined) delete target[field];
        else target[field] = value;
        return { ...entry, target };
      }),
    );
  }
  function save() {
    if (mutation.isPending) return;
    setError("");
    mutation.reset();
    if (!name.trim()) return setError("Enter a template name.");
    const xp = Number(bonusXP);
    if (!Number.isSafeInteger(xp) || xp < 1)
      return setError("Bonus XP must be a positive whole number.");
    if (!selected.length) return setError("Add at least one exercise.");
    for (const entry of selected) {
      if (!entry.exercise || !entry.exercise.isActive)
        return setError(
          "Remove or replace unavailable exercises before saving.",
        );
      const targetError = validateAdminWorkoutTarget(
        entry.exercise.measurementType,
        entry.target,
        entry.exercise.name,
      );
      if (targetError) return setError(targetError);
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim(),
      difficulty,
      bonusXP: xp,
      exercises: selected.map((entry, order) => ({
        exercise: entry.exercise!._id,
        order,
        target: entry.target,
      })),
    });
  }
  return (
    <AdminPage
      title={template ? "Edit WOTW template" : "New WOTW template"}
      busy={mutation.isPending}
    >
      {template && (
        <Text style={styles.text}>
          Scheduled challenges stay unchanged. Saving a previously scheduled
          template creates a new version.
        </Text>
      )}
      <View style={styles.card}>
        <AdminField
          label="TEMPLATE NAME"
          value={name}
          onChange={setName}
          disabled={mutation.isPending}
        />
        <AdminField
          label="DESCRIPTION"
          value={description}
          onChange={setDescription}
          multiline
          disabled={mutation.isPending}
        />
        <AdminChoices
          label="DIFFICULTY"
          options={wotwDifficulties}
          value={difficulty}
          onChange={setDifficulty}
          disabled={mutation.isPending}
        />
        <AdminField
          label="BONUS XP"
          value={bonusXP}
          onChange={setBonusXP}
          numeric
          disabled={mutation.isPending}
        />
      </View>
      <Text style={styles.cardTitle}>Exercises · {selected.length}</Text>
      {!selected.length && (
        <Text style={styles.text}>
          Choose exercises below, then set their targets.
        </Text>
      )}
      {selected.map((entry, index) => (
        <View key={entry.key} style={styles.card}>
          <Text style={styles.cardTitle}>
            {index + 1}. {entry.exercise?.name ?? "Unavailable exercise"}
          </Text>
          {entry.exercise?.isActive ? (
            <View pointerEvents={mutation.isPending ? "none" : "auto"}>
              <WorkoutExerciseTarget
                measurementType={entry.exercise.measurementType}
                target={entry.target}
                onTargetChange={(field, value) =>
                  changeTarget(entry.key, field, value)
                }
              />
            </View>
          ) : (
            <Text style={styles.error}>
              This exercise is unavailable. Remove or replace it.
            </Text>
          )}
          <View style={styles.choices}>
            <AdminButton
              label="↑ UP"
              disabled={mutation.isPending || index === 0}
              onPress={() => move(index, -1)}
            />
            <AdminButton
              label="↓ DOWN"
              disabled={mutation.isPending || index === selected.length - 1}
              onPress={() => move(index, 1)}
            />
            <AdminButton
              label="REMOVE"
              destructive
              disabled={mutation.isPending}
              onPress={() =>
                setSelected((current) =>
                  current.filter((row) => row.key !== entry.key),
                )
              }
            />
          </View>
        </View>
      ))}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add exercises</Text>
        <AdminField
          label="SEARCH EXERCISE LIBRARY"
          value={search}
          disabled={mutation.isPending}
          onChange={(value) => {
            setSearch(value.slice(0, 100));
            setPage(1);
          }}
        />
        <AdminQueryState query={exercises} />
        {!exercises.isPending &&
          !exercises.isError &&
          exercises.data?.exercises.length === 0 && (
            <Text style={styles.text}>No exercises found.</Text>
          )}
        {exercises.data?.exercises.map((exercise) => (
          <View key={exercise._id} style={styles.card}>
            <Text style={styles.cardTitle}>{exercise.name}</Text>
            <Text style={styles.text}>
              {exercise.measurementType.replaceAll("_", " ")}
            </Text>
            <AdminButton
              label="+ ADD EXERCISE"
              disabled={mutation.isPending}
              onPress={() => addExercise(exercise)}
            />
          </View>
        ))}
        {exercises.data && (
          <AdminPagination
            page={page}
            totalPages={exercises.data.pagination.totalPages}
            busy={exercises.isFetching || mutation.isPending}
            onChange={setPage}
          />
        )}
      </View>
      {(error || mutation.isError) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error || adminError(mutation.error)}
        </Text>
      )}
      <AdminButton
        label={mutation.isPending ? "SAVING..." : "SAVE TEMPLATE"}
        disabled={mutation.isPending}
        onPress={save}
      />
    </AdminPage>
  );
}
