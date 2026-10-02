import { AppText as Text } from "@/components/app-text";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Screen } from "@/components/screen";
import {
  AdminChoices,
  AdminField,
  adminAchievementStyles as styles,
} from "@/components/admin-achievement-ui";
import {
  achievementCategories,
  achievementRules,
  saveAdminAchievement,
  type AdminAchievement,
  type AchievementInput,
} from "@/api/admin-achievements";
import { getExerciseById, getExercises } from "@/api/exercises";
import { ApiError } from "@/api/client";

const runningDistances = [
  "100m",
  "200m",
  "400m",
  "800m",
  "1_mile",
  "1_5_miles",
  "2_miles",
  "5k",
  "10k",
  "half_marathon",
  "marathon",
];
const ruleHints: Record<AchievementInput["requirementType"], string> = {
  workout_count: "Total completed workouts.",
  personal_record_count:
    "Number of stored PR records, rather than the number of times a PR improved.",
  level_reached: "Minimum level reached.",
  echelon_reached: "Echelon number from 1 to 10.",
  verification_count: "Total approved verifications.",
  verified_performance:
    "Requires an approved performance for the selected exercise.",
  wotw_count: "Number of completed Workout of the Week sessions.",
  workout_streak: "Consecutive days with at least one completed workout.",
  workout_total_reps:
    "Total reps in a single workout, excluding skipped exercises.",
  workout_time_of_day:
    "Workout start time, using the app timezone. Enter a whole hour from 0 to 23.",
};

export function AdminAchievementForm({
  achievement,
}: {
  achievement?: AdminAchievement;
}) {
  const [name, setName] = useState(achievement?.name ?? "");
  const [description, setDescription] = useState(
    achievement?.description ?? "",
  );
  const [category, setCategory] = useState<AchievementInput["category"]>(
    achievement?.category ?? "workout",
  );
  const [rule, setRule] = useState<AchievementInput["requirementType"]>(
    achievement?.requirementType ?? "workout_count",
  );
  const [value, setValue] = useState(
    String(achievement?.requirement.value ?? ""),
  );
  const [xp, setXP] = useState(String(achievement?.xpReward ?? ""));
  const [badge, setBadge] = useState(achievement?.badgeKey ?? "");
  const [active, setActive] = useState(achievement?.isActive ?? true);
  const [secret, setSecret] = useState(achievement?.isSecret ?? false);
  const [exerciseId, setExerciseId] = useState(
    achievement?.requirement.exercise ?? "",
  );
  const [recordCategory, setRecordCategory] = useState(
    achievement?.requirement.recordCategory ?? "",
  );
  const [operator, setOperator] = useState<"before" | "after">(
    achievement?.requirement.operator ?? "before",
  );
  const [search, setSearch] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();
  const exercises = useInfiniteQuery({
    queryKey: ["achievement-exercises", exerciseSearch],
    queryFn: ({ pageParam }) =>
      getExercises({
        page: pageParam,
        limit: 20,
        search: exerciseSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.hasNextPage ? page.pagination.page + 1 : undefined,
    enabled: rule === "verified_performance",
  });
  const selected = useQuery({
    queryKey: ["achievement-exercise", exerciseId],
    queryFn: () => getExerciseById(exerciseId),
    enabled: rule === "verified_performance" && Boolean(exerciseId),
  });
  const measurement = selected.data?.exercise.measurementType;
  const categories =
    measurement === "weight_reps"
      ? ["any", "1RM", "3RM", "5RM", "8RM", "10RM", "12RM"]
      : measurement === "distance_time"
        ? runningDistances
        : [];
  const unit =
    measurement === "weight_reps"
      ? "Weight in pounds (at least)"
      : measurement === "reps"
        ? "Reps (at least)"
        : measurement === "duration"
          ? "Duration in seconds (at least)"
          : measurement === "time" || measurement === "distance_time"
            ? "Time in seconds (at most)"
            : rule === "workout_time_of_day"
              ? "Hour (0–23)"
              : "Target";
  const save = useMutation({
    mutationFn: (data: AchievementInput) =>
      saveAdminAchievement(data, achievement?._id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-achievements"] }),
        client.invalidateQueries({ queryKey: ["admin-achievement"] }),
        client.invalidateQueries({ queryKey: ["profile-records"] }),
      ]);
      router.back();
    },
  });
  function submit() {
    setError("");
    if (
      !name.trim() ||
      !description.trim() ||
      !badge.trim() ||
      !value.trim() ||
      !Number.isFinite(Number(value))
    ) {
      setError("Complete every field and enter a valid target.");
      return;
    }
    if (
      !xp.trim() ||
      !Number.isInteger(Number(xp)) ||
      Number(xp) < 1 ||
      Number(xp) > 150
    ) {
      setError("XP reward must be a whole number from 1 to 150.");
      return;
    }
    if (
      rule === "verified_performance" &&
      (!exerciseId || selected.isPending || selected.isError)
    ) {
      setError("Choose an exercise and wait for its details to load.");
      return;
    }
    save.mutate({
      name: name.trim(),
      description: description.trim(),
      category,
      requirementType: rule,
      requirement: {
        value: Number(value),
        exercise: rule === "verified_performance" ? exerciseId : null,
        recordCategory:
          rule === "verified_performance" ? recordCategory || null : null,
        operator: rule === "workout_time_of_day" ? operator : null,
      },
      xpReward: Number(xp),
      badgeKey: badge.trim(),
      isActive: active,
      isSecret: secret,
    });
  }
  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <Pressable
          style={styles.button}
          disabled={save.isPending}
          onPress={() => router.back()}
        >
          <Text style={styles.action}>← BACK</Text>
        </Pressable>
        <Text style={styles.title}>
          {achievement ? "Edit Achievement" : "Create Achievement"}
        </Text>
        <Text style={styles.text}>
          Achievements are checked during the next relevant workout or
          verification. Saving does not award them retroactively.
        </Text>
        {achievement && (
          <Text style={styles.text}>
            Changes apply to this achievement; existing unlocks remain earned
            and do not award XP again.
          </Text>
        )}
        <AdminField label="Name" value={name} onChange={setName} />
        <AdminField
          label="Description"
          value={description}
          onChange={setDescription}
          multiline
        />
        <AdminChoices
          label="Category"
          options={achievementCategories}
          value={category}
          onChange={setCategory}
        />
        <AdminChoices
          label="Unlock rule"
          options={achievementRules}
          value={rule}
          onChange={(next) => {
            setRule(next);
            setExerciseId("");
            setRecordCategory("");
            setValue("");
          }}
        />
        <Text style={styles.text}>{ruleHints[rule]}</Text>
        {rule === "verified_performance" && (
          <View style={styles.card}>
            <Text style={styles.label}>EXERCISE</Text>
            {selected.data && (
              <Text style={styles.text}>
                Selected: {selected.data.exercise.name}
              </Text>
            )}
            {selected.isFetching && exerciseId && <ActivityIndicator />}
            {selected.isError && (
              <Pressable
                style={styles.button}
                onPress={() => {
                  void selected.refetch();
                }}
              >
                <Text style={styles.error}>
                  Unable to load selected exercise. Tap to retry.
                </Text>
              </Pressable>
            )}
            <AdminField
              label="Search exercises"
              value={search}
              onChange={setSearch}
            />
            <Pressable
              style={styles.button}
              onPress={() => setExerciseSearch(search.trim())}
            >
              <Text style={styles.action}>SEARCH</Text>
            </Pressable>
            {exercises.isPending && <ActivityIndicator />}
            {exercises.isError && (
              <Pressable
                style={styles.button}
                onPress={() => {
                  void exercises.refetch();
                }}
              >
                <Text style={styles.error}>
                  Unable to load exercises. Tap to retry.
                </Text>
              </Pressable>
            )}
            {exercises.data?.pages
              .flatMap((page) => page.exercises)
              .filter((exercise) => exercise.measurementType !== "intervals")
              .map((exercise) => (
                <Pressable
                  key={exercise._id}
                  style={[
                    styles.button,
                    exerciseId === exercise._id && styles.selected,
                  ]}
                  onPress={() => {
                    setExerciseId(exercise._id);
                    setRecordCategory("");
                  }}
                >
                  <Text style={styles.text}>{exercise.name}</Text>
                </Pressable>
              ))}
            {exercises.hasNextPage && (
              <Pressable
                style={styles.button}
                disabled={exercises.isFetching}
                onPress={() => {
                  void exercises.fetchNextPage();
                }}
              >
                <Text style={styles.action}>MORE EXERCISES</Text>
              </Pressable>
            )}
            {categories.length > 0 && (
              <AdminChoices
                label={
                  measurement === "distance_time"
                    ? "Running distance"
                    : "Rep category"
                }
                options={categories}
                value={recordCategory || "any"}
                onChange={(next) =>
                  setRecordCategory(next === "any" ? "" : next)
                }
              />
            )}
          </View>
        )}
        {rule === "workout_time_of_day" && (
          <AdminChoices
            label="When"
            options={["before", "after"] as const}
            value={operator}
            onChange={setOperator}
          />
        )}
        <AdminField label={unit} value={value} onChange={setValue} numeric />
        <AdminField
          label="XP reward (1–150)"
          value={xp}
          onChange={setXP}
          numeric
        />
        <AdminField label="Badge key" value={badge} onChange={setBadge} />
        <Text style={styles.text}>
          Use your existing badge identifier. Profile cards currently display
          the shared achievement icon.
        </Text>
        <AdminChoices
          label="Availability"
          options={["active", "inactive"]}
          value={active ? "active" : "inactive"}
          onChange={(next) => setActive(next === "active")}
        />
        <AdminChoices
          label="Visibility"
          options={["normal", "secret"]}
          value={secret ? "secret" : "normal"}
          onChange={(next) => setSecret(next === "secret")}
        />
        {(error || save.isError) && (
          <Text style={styles.error}>
            {error ||
              (save.error instanceof ApiError
                ? save.error.getDisplayMessage()
                : "Unable to save achievement.")}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={save.isPending}
          onPress={submit}
          style={styles.button}
        >
          <Text style={styles.action}>
            {save.isPending ? "SAVING..." : "SAVE ACHIEVEMENT"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
