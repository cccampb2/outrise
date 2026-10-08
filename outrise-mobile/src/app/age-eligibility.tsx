import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { confirmAgeEligibility } from "@/api/auth";
import { ApiError } from "@/api/client";
import { getCurrentUser } from "@/api/users";
import { deleteToken } from "@/storage/auth-storage";
import { clearCurrentUser, setCurrentUser } from "@/store/auth-slice";
import { store, type AppDispatch, type RootState } from "@/store/store";

export default function AgeEligibilityScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();
  const [age, setAge] = useState("");
  const blocked = Boolean(user?.ageEligibilityRejectedAt);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), [user?.id]);

  async function confirm() {
    if (!user || inFlight.current || blocked) return;
    setError("");
    if (!/^\d{1,3}$/.test(age) || Number(age) > 120) {
      setError("Enter a valid whole-number age.");
      return;
    }
    const userId = user.id;
    const controller = new AbortController();
    activeRequest.current = controller;
    inFlight.current = true;
    setPending(true);
    try {
      const result = await confirmAgeEligibility(
        Number(age),
        controller.signal,
      );
      if (result.ageEligibilityRejectedAt) {
        if (
          !controller.signal.aborted &&
          store.getState().auth.user?.id === userId
        ) {
          dispatch(
            setCurrentUser({
              ...user,
              ageEligibilityConfirmedAt: null,
              ageEligibilityRejectedAt: result.ageEligibilityRejectedAt,
            }),
          );
          setAge("");
        }
        return;
      }
      const currentUser = await getCurrentUser(controller.signal);
      if (
        controller.signal.aborted ||
        store.getState().auth.user?.id !== userId
      )
        return;
      if (!currentUser.ageEligibilityConfirmedAt)
        throw new Error(
          "Eligibility could not be confirmed. Please try again.",
        );
      dispatch(setCurrentUser(currentUser));
      router.replace("/");
    } catch (error) {
      if (
        controller.signal.aborted ||
        store.getState().auth.user?.id !== userId
      )
        return;
      setError(
        error instanceof ApiError
          ? error.getDisplayMessage()
          : "Unable to confirm eligibility. Please try again.",
      );
    } finally {
      inFlight.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  async function signOut() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await deleteToken();
      dispatch(clearCurrentUser());
      await client.cancelQueries();
      client.clear();
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (!user || user.ageEligibilityConfirmedAt) return <Redirect href="/" />;
  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <BrandHeader label="ACCOUNT ELIGIBILITY" />
        <Text style={styles.title}>Confirm your eligibility</Text>
        <Text style={styles.text}>
          {blocked
            ? "Outrise is available to adults aged 18 or older. This account is restricted based on your age answer. Signing in again or changing your answer will not clear it. Contact support if you made a mistake or are now eligible."
            : "Enter your current age to continue. We do not save your age or birth date. An under-18 answer restricts this account until support reviews it."}
        </Text>
        {!blocked ? (
          <View style={styles.form}>
            <Text style={styles.label}>AGE</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              editable={!pending}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="Enter your age"
              placeholderTextColor={Colors.dark.textMuted}
              accessibilityLabel="Your current age"
            />
            <Text style={styles.text}>
              By continuing, you confirm that the age you entered is accurate.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, pending && styles.disabled]}
              disabled={pending}
              onPress={() => void confirm()}
            >
              <Text style={styles.buttonText}>
                {pending ? "CONFIRMING..." : "CONFIRM AND CONTINUE →"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {blocked && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/report-issue")}
            style={styles.signOut}
          >
            <Text style={styles.link}>CONTACT SUPPORT →</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/delete-account")}
          disabled={pending}
          style={styles.signOut}
        >
          <Text style={styles.link}>DELETE ACCOUNT →</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          style={styles.signOut}
          onPress={() => void signOut()}
        >
          <Text style={styles.link}>SIGN OUT →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 32, gap: 20 },
  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: "900",
  },
  text: { color: Colors.dark.textSecondary, fontSize: 15, lineHeight: 23 },
  form: { gap: 14 },
  label: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    color: Colors.dark.text,
    padding: 15,
    fontSize: 18,
  },
  button: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSelected,
    padding: 14,
  },
  buttonText: {
    color: Colors.dark.accent,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  disabled: { opacity: 0.5 },
  error: { color: Colors.dark.danger, fontSize: 14, lineHeight: 21 },
  signOut: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  link: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "700" },
});
