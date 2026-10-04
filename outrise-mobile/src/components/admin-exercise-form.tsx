import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExercise, updateExercise, getExerciseById, type Exercise, type ExerciseInput } from "@/api/exercises";
import { AppText as Text } from "./app-text";
import { AdminField, AdminChoices, adminAchievementStyles as styles } from "./admin-achievement-ui";
import { AdminPage, AdminButton, AdminQueryState, adminError, useAdminAccess, invalidateExerciseQueries } from "./admin-content-ui";

const categories = ["strength", "cardio", "bodyweight", "mobility"] as const;
const measurementTypes = ["weight_reps", "reps", "time", "distance_time", "duration", "intervals"] as const;
function slugify(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function splitValues(value: string, separator: string) {
  return value.split(separator).map((entry) => entry.trim()).filter(Boolean);
}

export function AdminExerciseEditor({ exerciseId }: { exerciseId?: string }) {
  const isAdmin = useAdminAccess();
  const query = useQuery({ queryKey: ["admin-exercise", exerciseId], queryFn: () => getExerciseById(exerciseId!), enabled: isAdmin && Boolean(exerciseId) });
  if (!isAdmin || (exerciseId && !query.data)) {
    return <AdminPage title="Edit exercise"><AdminQueryState query={query} /></AdminPage>;
  }
  return <AdminExerciseForm key={exerciseId ?? "create"} exercise={query.data?.exercise} />;
}

function AdminExerciseForm({ exercise }: { exercise?: Exercise }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState({
    name: exercise?.name ?? "", slug: exercise?.slug ?? "", description: exercise?.description ?? "",
    category: exercise?.category ?? "strength", measurementType: exercise?.measurementType ?? "weight_reps",
    xp: String(exercise?.baseXP ?? 5), muscles: exercise?.muscleGroups.join(", ") ?? "",
    equipment: exercise?.equipment.join(", ") ?? "", instructions: exercise?.instructions.join("\n") ?? "", video: exercise?.videoUrl ?? "",
  });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (input: ExerciseInput) => exercise ? updateExercise(exercise._id, input) : createExercise(input),
    onSuccess: async () => {
      await invalidateExerciseQueries(client);
      Alert.alert("Exercise saved", "The exercise library has been updated.", [{ text: "OK", onPress: () => router.back() }]);
    },
  });
  function save() {
    if (mutation.isPending) return;
    setError("");
    mutation.reset();
    const baseXP = Number(draft.xp);
    if (draft.name.trim().length < 2 || draft.name.trim().length > 100) return setError("Enter a name between 2 and 100 characters.");
    if (!/^[a-z0-9-]+$/.test(draft.slug.trim())) return setError("Use lowercase letters, numbers, and hyphens for the slug.");
    if (draft.description.trim().length < 10 || draft.description.trim().length > 1000) return setError("Enter a description between 10 and 1,000 characters.");
    if (!Number.isInteger(baseXP) || baseXP < 5 || baseXP > 30) return setError("Exercise XP must be a whole number from 5 to 30.");
    if (draft.video.trim() && !/^https?:\/\//i.test(draft.video.trim())) return setError("Enter an http or https video URL, or leave it blank.");
    mutation.mutate({
      name: draft.name.trim(), slug: draft.slug.trim(), description: draft.description.trim(),
      category: draft.category, measurementType: draft.measurementType, baseXP,
      muscleGroups: splitValues(draft.muscles, ","), equipment: splitValues(draft.equipment, ","),
      instructions: splitValues(draft.instructions, "\n"), videoUrl: draft.video.trim() || null,
    });
  }
  return <AdminPage title={exercise ? "Edit exercise" : "New exercise"} busy={mutation.isPending}>
    <View style={styles.card}>
      <AdminField label="NAME" value={draft.name} disabled={mutation.isPending} onChange={(name) => setDraft((current) => ({ ...current, name, slug: current.slug === slugify(current.name) ? slugify(name) : current.slug }))} />
      <AdminField label="SLUG" value={draft.slug} disabled={mutation.isPending} onChange={(slug) => setDraft((current) => ({ ...current, slug: slug.toLowerCase().replace(/\s+/g, "-") }))} />
      <AdminField label="DESCRIPTION" multiline value={draft.description} disabled={mutation.isPending} onChange={(description) => setDraft((current) => ({ ...current, description }))} />
      <AdminChoices label="CATEGORY" options={categories} value={draft.category} disabled={mutation.isPending} onChange={(category) => setDraft((current) => ({ ...current, category }))} />
      <AdminChoices label="LOGGING TYPE" options={measurementTypes} value={draft.measurementType} disabled={mutation.isPending} onChange={(measurementType) => setDraft((current) => ({ ...current, measurementType }))} />
      {exercise && <Text style={styles.text}>If you change the logging type, check the workout templates that use this exercise.</Text>}
      <AdminField label="BASE XP · 5–30" numeric value={draft.xp} disabled={mutation.isPending} onChange={(xp) => setDraft((current) => ({ ...current, xp }))} />
      <AdminField label="MUSCLE GROUPS · SEPARATE WITH COMMAS" value={draft.muscles} disabled={mutation.isPending} onChange={(muscles) => setDraft((current) => ({ ...current, muscles }))} />
      <AdminField label="EQUIPMENT · SEPARATE WITH COMMAS" value={draft.equipment} disabled={mutation.isPending} onChange={(equipment) => setDraft((current) => ({ ...current, equipment }))} />
      <AdminField label="INSTRUCTIONS · ONE STEP PER LINE" multiline value={draft.instructions} disabled={mutation.isPending} onChange={(instructions) => setDraft((current) => ({ ...current, instructions }))} />
      <AdminField label="VIDEO URL · OPTIONAL" value={draft.video} disabled={mutation.isPending} onChange={(video) => setDraft((current) => ({ ...current, video }))} />
    </View>
    {(error || mutation.isError) && <Text accessibilityRole="alert" style={styles.error}>{error || adminError(mutation.error)}</Text>}
    <AdminButton label={mutation.isPending ? "SAVING..." : "SAVE EXERCISE"} disabled={mutation.isPending} onPress={save} />
  </AdminPage>;
}
