import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { StyleSheet, View, ActivityIndicator, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useDispatch } from "react-redux";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import {
  getFactionAssessment,
  submitFactionAssessment,
  getFactions,
  type AssessmentQuestion,
} from "@/api/factions";
import type { AppDispatch } from "@/store/store";
import { setRecommendedFaction } from "@/store/onboarding-slice";

export default function AssessmentScreen() {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  function handleSelectAnswer(questionId: string, optionId: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: optionId,
    }));
  }

  async function handleContinue() {
    if (!selectedOptionId) {
      return;
    }

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    if (!isLastQuestion) {
      setCurrentQuestionIndex((currentIndex) => currentIndex + 1);

      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const assessmentAnswers = questions.map(
        (question) => answers[question.id],
      );

      const result = await submitFactionAssessment(assessmentAnswers);

      const factionData = await getFactions();

      const recommendedFaction = factionData.factions.find(
        (faction) => faction.slug === result.recommendedFaction,
      );

      if (!recommendedFaction) {
        throw new Error("Recommended faction could not be found");
      }

      dispatch(setRecommendedFaction(recommendedFaction));

      router.replace("/(onboarding)/reveal");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to submit faction assessment");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    async function loadAssessment() {
      try {
        const data = await getFactionAssessment();

        setQuestions(data.questions);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Unable to load faction assessment");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadAssessment();
  }, []);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />

          <BrandHeader label="ASSESSMENT" style={styles.brandLoadingLayout} />

          <Text style={styles.loadingText}>INITIALIZING_ASSESSMENT...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorLabel}>{"// ASSESSMENT_ERROR"}</Text>

          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  const selectedOptionId = answers[currentQuestion.id];

  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <Screen>
      <View style={styles.container}>
        {/* SYSTEM HEADER */}

        <View style={styles.systemHeader}>
          <BrandHeader label="ASSESSMENT" />

          <Text style={styles.questionCode}>
            {`${String(currentQuestionIndex + 1).padStart(2, "0")}/${String(
              questions.length,
            ).padStart(2, "0")}`}
          </Text>
        </View>

        {/* PROGRESS */}

        <View style={styles.progressArea}>
          <View style={styles.progressHeader}>
            <Text style={styles.eyebrow}>FACTION_ASSESSMENT</Text>

            <Text style={styles.progress}>
              {`QUESTION_${String(currentQuestionIndex + 1).padStart(2, "0")}`}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* QUESTION */}

        <View style={styles.questionArea}>
          <Text style={styles.questionLabel}>SELECT_YOUR_RESPONSE</Text>

          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* OPTIONS */}

        <View style={styles.options}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() =>
                  handleSelectAnswer(currentQuestion.id, option.id)
                }
                style={({ pressed }) => [
                  styles.option,
                  isSelected ? styles.optionSelected : null,
                  pressed ? styles.optionPressed : null,
                ]}
              >
                <View
                  style={[
                    styles.optionIndex,
                    isSelected ? styles.optionIndexSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionIndexText,
                      isSelected ? styles.optionIndexTextSelected : null,
                    ]}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.optionText,
                    isSelected ? styles.optionTextSelected : null,
                  ]}
                >
                  {option.text}
                </Text>

                <View
                  style={[
                    styles.selectionIndicator,
                    isSelected ? styles.selectionIndicatorSelected : null,
                  ]}
                >
                  {isSelected ? (
                    <View style={styles.selectionIndicatorInner} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ACTION */}

        <Pressable
          disabled={!selectedOptionId || isSubmitting}
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueButton,
            (!selectedOptionId || isSubmitting) &&
              styles.continueButtonDisabled,
            pressed && selectedOptionId && !isSubmitting
              ? styles.continueButtonPressed
              : null,
          ]}
        >
          <View style={styles.buttonMarker} />

          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={Colors.dark.accent}
              style={styles.buttonContent}
            />
          ) : (
            <Text style={styles.continueButtonText}>
              {currentQuestionIndex === questions.length - 1
                ? "COMPLETE_ASSESSMENT"
                : "CONTINUE"}
            </Text>
          )}

          <Text style={styles.buttonArrow}>→</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLoadingLayout: {
    marginTop: 18,
  },

  container: {
    flex: 1,
    paddingTop: 34,
    paddingBottom: 24,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* LOADING / ERROR */

  loadingText: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 6,
  },

  errorLabel: {
    color: Colors.dark.danger,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  /* SYSTEM HEADER */

  systemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  questionCode: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  /* PROGRESS */

  progressArea: {
    marginTop: 34,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
  },

  progress: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  progressTrack: {
    height: 3,
    backgroundColor: Colors.dark.borderSubtle,
  },

  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
  },

  /* QUESTION */

  questionArea: {
    marginTop: 34,
  },

  questionLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  questionText: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 25,
    lineHeight: 33,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  /* OPTIONS */

  options: {
    marginTop: 28,
    gap: 10,
  },

  option: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 14,
  },

  optionSelected: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderColor: Colors.dark.accent,
  },

  optionPressed: {
    opacity: 0.75,
  },

  optionIndex: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 12,
  },

  optionIndexSelected: {
    borderColor: Colors.dark.accent,
  },

  optionIndexText: {
    color: Colors.dark.textDim,
    fontSize: 8,
    fontWeight: "900",
  },

  optionIndexTextSelected: {
    color: Colors.dark.accent,
  },

  optionText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 12,
  },

  optionTextSelected: {
    color: Colors.dark.text,
    fontWeight: "700",
  },

  selectionIndicator: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: Colors.dark.textDim,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  selectionIndicatorSelected: {
    borderColor: Colors.dark.accent,
  },

  selectionIndicatorInner: {
    width: 6,
    height: 6,
    backgroundColor: Colors.dark.accent,
  },

  /* CONTINUE */

  continueButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 14,
    marginTop: 30,
  },

  continueButtonDisabled: {
    opacity: 0.35,
  },

  continueButtonPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    transform: [{ scale: 0.99 }],
  },

  buttonMarker: {
    width: 3,
    height: 20,
    backgroundColor: Colors.dark.accent,
  },

  buttonContent: {
    flex: 1,
  },

  continueButtonText: {
    flex: 1,
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  buttonArrow: {
    color: Colors.dark.accent,
    fontSize: 17,
    fontWeight: "900",
  },
});
