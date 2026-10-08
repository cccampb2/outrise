import { ExerciseSafety } from "@/components/exercise-safety";
import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { getExerciseById } from "@/api/exercises";

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{
    exerciseId: string;
  }>();

  const exerciseQuery = useQuery({
    queryKey: ["exercise", exerciseId],

    queryFn: () => getExerciseById(exerciseId),

    enabled: !!exerciseId,
  });

  if (exerciseQuery.isPending) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <ActivityIndicator color={Colors.dark.accent} />

          <Text style={styles.stateText}>{"// LOADING_EXERCISE..."}</Text>
        </View>
      </Screen>
    );
  }

  if (exerciseQuery.isError) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <Text style={styles.errorCode}>SYSTEM_ERROR</Text>

          <Text style={styles.stateText}>Unable to load exercise.</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => exerciseQuery.refetch()}
          >
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const exercise = exerciseQuery.data.exercise;

  return (
    <Screen scroll>
      {/* BACK */}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>

      {/* HEADER */}

      <View style={styles.header}>
        <BrandHeader label="EXERCISE_LIBRARY" style={styles.brandLabelLayout} />

        <Text style={styles.title}>{exercise.name}</Text>

        <View style={styles.metadataRow}>
          <Text style={styles.metadata}>{exercise.category.toUpperCase()}</Text>

          <View style={styles.metadataDivider} />

          <Text style={styles.metadata}>
            {exercise.measurementType.replaceAll("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      <ExerciseSafety />
      {/* DESCRIPTION */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>01</Text>

          <Text style={styles.sectionTitle}>OVERVIEW</Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.description}>
            {exercise.description || "No description available."}
          </Text>
        </View>
      </View>

      {/* MUSCLE GROUPS */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>02</Text>

          <Text style={styles.sectionTitle}>MUSCLE_GROUPS</Text>
        </View>

        {exercise.muscleGroups.length > 0 ? (
          <View style={styles.tagContainer}>
            {exercise.muscleGroups.map((muscleGroup) => (
              <View key={muscleGroup} style={styles.tag}>
                <Text style={styles.tagText}>{muscleGroup.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.contentCard}>
            <Text style={styles.emptyText}>NO_MUSCLE_GROUP_DATA</Text>
          </View>
        )}
      </View>

      {/* EQUIPMENT */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>03</Text>

          <Text style={styles.sectionTitle}>EQUIPMENT</Text>
        </View>

        {exercise.equipment.length > 0 ? (
          <View style={styles.tagContainer}>
            {exercise.equipment.map((equipment) => (
              <View key={equipment} style={styles.tag}>
                <Text style={styles.tagText}>{equipment.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.contentCard}>
            <Text style={styles.emptyText}>NO_EQUIPMENT_REQUIRED</Text>
          </View>
        )}
      </View>

      {/* INSTRUCTIONS */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>04</Text>

          <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
        </View>

        {exercise.instructions.length > 0 ? (
          <View style={styles.instructionList}>
            {exercise.instructions.map((instruction, index) => (
              <View
                key={`${index}-${instruction}`}
                style={styles.instructionCard}
              >
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>

                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.contentCard}>
            <Text style={styles.emptyText}>NO_INSTRUCTIONS_AVAILABLE</Text>
          </View>
        )}
      </View>

      {/* VIDEO */}

      {exercise.videoUrl ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNumber}>05</Text>

            <Text style={styles.sectionTitle}>DEMONSTRATION</Text>
          </View>

          <View style={styles.videoCard}>
            <View style={styles.videoIcon}>
              <Ionicons name="play" size={18} color={Colors.dark.accent} />
            </View>

            <View style={styles.videoContent}>
              <Text style={styles.videoLabel}>VIDEO_DEMONSTRATION</Text>

              <Text style={styles.videoSubtext}>
                Exercise demonstration available
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* FOOTER */}

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <View style={styles.footerNode} />
        <View style={styles.footerLine} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 10,
  },

  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stateText: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 10,
    textAlign: "center",
  },

  errorCode: {
    color: Colors.dark.danger,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  retryText: {
    color: Colors.dark.textSecondary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 24,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  header: {
    marginBottom: 34,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },

  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 10,
  },

  metadata: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  metadataDivider: {
    width: 3,
    height: 3,
    backgroundColor: Colors.dark.accent,
    transform: [{ rotate: "45deg" }],
  },

  section: {
    marginBottom: 28,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  sectionNumber: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "800",
  },

  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  contentCard: {
    padding: 16,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  description: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },

  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  tag: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  tagText: {
    color: Colors.dark.textSecondary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  emptyText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  instructionList: {
    gap: 8,
  },

  instructionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  instructionNumber: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  instructionNumberText: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
  },

  instructionText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    paddingTop: 5,
  },

  videoCard: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  videoIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  videoContent: {
    flex: 1,
  },

  videoLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  videoSubtext: {
    color: Colors.dark.textDim,
    fontSize: 8,
    marginTop: 4,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
    marginBottom: 12,
  },

  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  footerNode: {
    width: 4,
    height: 4,
    backgroundColor: Colors.dark.textDim,
    transform: [{ rotate: "45deg" }],
  },
});
