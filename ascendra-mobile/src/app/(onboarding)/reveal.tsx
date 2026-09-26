import { StyleSheet, Text, View, Image, Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import { scheduleOnRN } from "react-native-worklets";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";

import { factionEmblems } from "@/constants/faction-assets";
import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import type { RootState, AppDispatch } from "@/store/store";
import { confirmFaction } from "@/api/factions";
import { setCurrentUser } from "@/store/auth-slice";
import { getCurrentUser } from "@/api/users";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function RevealScreen() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  const emblemScale = useSharedValue(25);
  const emblemOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(16);

  const dispatch = useDispatch<AppDispatch>();

  const recommendedFaction = useSelector(
    (state: RootState) => state.onboarding.recommendedFaction,
  );

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      {
        translateY: textTranslateY.value,
      },
    ],
  }));

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: shakeX.value,
      },
    ],
  }));

  const emblemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: emblemOpacity.value,
    transform: [
      {
        scale: emblemScale.value,
      },
    ],
  }));

  function triggerImpact() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  useEffect(() => {
    emblemOpacity.value = withTiming(1, {
      duration: 100,
    });

    emblemScale.value = withSequence(
      withTiming(
        0.9,
        {
          duration: 550,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(triggerImpact);

            shakeX.value = withSequence(
              withTiming(-8, {
                duration: 25,
              }),
              withTiming(7, {
                duration: 25,
              }),
              withTiming(-5, {
                duration: 25,
              }),
              withTiming(3, {
                duration: 25,
              }),
              withTiming(0, {
                duration: 30,
              }),
            );
          }
        },
      ),
      withTiming(1.08, {
        duration: 90,
        easing: Easing.in(Easing.quad),
      }),
      withTiming(
        1,
        {
          duration: 100,
          easing: Easing.out(Easing.quad),
        },
        (finished) => {
          if (finished) {
            textOpacity.value = withTiming(1, {
              duration: 350,
            });

            textTranslateY.value = withTiming(0, {
              duration: 350,
              easing: Easing.out(Easing.cubic),
            });
          }
        },
      ),
    );
  }, [emblemOpacity, emblemScale, shakeX, textOpacity, textTranslateY]);

  if (!recommendedFaction) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorLabel}>{"// FACTION_DATA_ERROR"}</Text>

          <Text style={styles.errorText}>No faction recommendation found.</Text>
        </View>
      </Screen>
    );
  }

  async function handleAcceptFaction() {
    setIsConfirming(true);
    setError("");

    try {
      await confirmFaction(recommendedFaction.slug);

      const user = await getCurrentUser();

      dispatch(setCurrentUser(user));

      router.replace("/(tabs)");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to confirm faction");
      }
    } finally {
      setIsConfirming(false);
    }
  }

  const emblem = factionEmblems[recommendedFaction.slug];

  const accent = recommendedFaction.colors.primary;

  const accentBorder = recommendedFaction.colors.border;

  return (
    <Screen>
      <View style={styles.container}>
        {/* SYSTEM HEADER */}

        <View style={styles.systemHeader}>
          <View style={styles.systemStatus}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: accent,
                },
              ]}
            />

            <Text style={styles.systemStatusText}>
              ASCENDRA // FACTION_MATCH
            </Text>
          </View>

          <Text
            style={[
              styles.matchStatus,
              {
                color: accent,
              },
            ]}
          >
            MATCH_FOUND
          </Text>
        </View>

        {/* REVEAL */}

        <Animated.View style={[styles.revealContent, shakeAnimatedStyle]}>
          <View style={styles.emblemArea}>
            <View
              style={[
                styles.emblemGlow,
                {
                  backgroundColor: recommendedFaction.colors.glow,
                },
              ]}
            />

            <View
              style={[
                styles.orbitLarge,
                {
                  borderColor: accentBorder,
                },
              ]}
            />

            <View
              style={[
                styles.orbitSmall,
                {
                  borderColor: accentBorder,
                },
              ]}
            />

            <AnimatedImage
              source={emblem}
              style={[styles.emblem, emblemAnimatedStyle]}
              resizeMode="contain"
            />
          </View>

          <Animated.View style={[styles.factionInfo, textAnimatedStyle]}>
            <View style={styles.revealLabelRow}>
              <View
                style={[
                  styles.revealLine,
                  {
                    backgroundColor: accent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.label,
                  {
                    color: accent,
                  },
                ]}
              >
                YOUR_FACTION
              </Text>

              <View
                style={[
                  styles.revealLine,
                  {
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>

            <Text style={styles.title}>
              {recommendedFaction.name.toUpperCase()}
            </Text>

            <Text style={styles.tagline}>{recommendedFaction.tagline}</Text>

            <View
              style={[
                styles.factionPanel,
                {
                  borderColor: accentBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.hudCornerTL,
                  {
                    borderColor: accent,
                  },
                ]}
              />

              <View
                style={[
                  styles.hudCornerBR,
                  {
                    borderColor: accent,
                  },
                ]}
              />

              <Text style={styles.descriptionLabel}>FACTION_PROFILE</Text>

              <Text style={styles.description}>
                {recommendedFaction.description}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                disabled={isConfirming}
                onPress={handleAcceptFaction}
                style={({ pressed }) => [
                  styles.acceptButton,
                  {
                    borderColor: accent,
                    backgroundColor: pressed
                      ? recommendedFaction.colors.darkSurface
                      : Colors.dark.backgroundSelected,
                    opacity: isConfirming ? 0.55 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.buttonMarker,
                    {
                      backgroundColor: accent,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.acceptButtonText,
                    {
                      color: accent,
                    },
                  ]}
                >
                  {isConfirming ? "CONFIRMING..." : "ACCEPT_FACTION"}
                </Text>

                <Text
                  style={[
                    styles.buttonArrow,
                    {
                      color: accent,
                    },
                  ]}
                >
                  →
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.otherFactionsButton,
                  {
                    borderColor: pressed ? accentBorder : Colors.dark.border,
                  },
                  pressed ? styles.secondaryPressed : null,
                ]}
              >
                <Text style={styles.otherFactionsButtonText}>
                  VIEW_OTHER_FACTIONS
                </Text>
              </Pressable>

              {error ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.actionErrorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingBottom: 20,
  },

  /* SYSTEM HEADER */

  systemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  systemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  systemStatusText: {
    color: Colors.dark.textTechnical,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  matchStatus: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  /* REVEAL */

  revealContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emblemArea: {
    width: 250,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  emblemGlow: {
    position: "absolute",
    width: 145,
    height: 145,
    borderRadius: 73,
    opacity: 0.12,
  },

  orbitLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.65,
  },

  orbitSmall: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.85,
  },

  emblem: {
    width: 180,
    height: 180,
  },

  factionInfo: {
    alignItems: "center",
    width: "100%",
  },

  revealLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  revealLine: {
    width: 24,
    height: 1,
  },

  label: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
  },

  title: {
    color: Colors.dark.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 8,
    textAlign: "center",
  },

  tagline: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
  },

  /* PROFILE */

  factionPanel: {
    position: "relative",
    width: "100%",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    padding: 16,
    marginTop: 24,
  },

  hudCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },

  hudCornerBR: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },

  descriptionLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  description: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  /* ACTIONS */

  actions: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },

  acceptButton: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 14,
  },

  buttonMarker: {
    width: 3,
    height: 20,
  },

  acceptButtonText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
    textAlign: "center",
  },

  buttonArrow: {
    fontSize: 17,
    fontWeight: "900",
  },

  otherFactionsButton: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    paddingHorizontal: 20,
  },

  secondaryPressed: {
    backgroundColor: Colors.dark.backgroundSelected,
  },

  otherFactionsButtonText: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  /* ERRORS */

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

  errorMessage: {
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    padding: 10,
  },

  actionErrorText: {
    color: Colors.dark.danger,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
