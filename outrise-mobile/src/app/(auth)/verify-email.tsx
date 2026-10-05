import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
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
import { confirmEmailVerification, requestEmailVerification } from "@/api/auth";
import { ApiError } from "@/api/client";
import { getCurrentUser } from "@/api/users";
import { deleteToken } from "@/storage/auth-storage";
import {
  clearCurrentUser,
  setCurrentUser,
  setEmailVerificationResendAt,
} from "@/store/auth-slice";
import { store, type AppDispatch, type RootState } from "@/store/store";

export default function VerifyEmailScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const resendAt = useSelector(
    (state: RootState) => state.auth.emailVerificationResendAt,
  );
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<
    "confirm" | "resend" | "sign-out" | null
  >(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [now, setNow] = useState(Date.now);
  const inFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();
  const resendSeconds = Math.max(0, Math.ceil(((resendAt ?? 0) - now) / 1000));

  useEffect(() => {
    // Only an explicit press requests an email. Revisiting this screen keeps the cooldown.
    if (!resendAt || resendAt <= Date.now()) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resendAt]);

  useEffect(() => () => activeRequest.current?.abort(), [user?.id]);

  function sessionMatches(userId: string, signal: AbortSignal) {
    return !signal.aborted && store.getState().auth.user?.id === userId;
  }

  async function finishVerification(userId: string, signal: AbortSignal) {
    const currentUser = await getCurrentUser(signal);
    if (!sessionMatches(userId, signal)) return;
    if (currentUser.emailVerified !== true)
      throw new Error(
        "Your account has not been verified yet. Please try again.",
      );
    dispatch(setCurrentUser(currentUser));
    router.replace(
      currentUser.faction === null ? "/(onboarding)/faction" : "/(tabs)",
    );
  }

  async function sendCode() {
    if (!user || inFlight.current || confirmed || (resendAt ?? 0) > Date.now())
      return;
    const userId = user.id;
    const controller = new AbortController();
    activeRequest.current = controller;
    inFlight.current = true;
    setPending("resend");
    setError("");
    let verified = false;
    try {
      const result = await requestEmailVerification(controller.signal);
      if (!sessionMatches(userId, controller.signal)) return;
      if (result.emailVerified) {
        verified = true;
        setConfirmed(true);
        await finishVerification(userId, controller.signal);
        return;
      }
      const sentAt = Date.now();
      setNow(sentAt);
      dispatch(
        setEmailVerificationResendAt(
          sentAt + Math.max(60, result.resendAfterSeconds) * 1000,
        ),
      );
      setNotice(result.message);
      setCode("");
    } catch (error) {
      if (!sessionMatches(userId, controller.signal)) return;
      if (
        error instanceof ApiError &&
        (error.retryAfterSeconds || error.status === 429)
      ) {
        const requestedAt = Date.now();
        setNow(requestedAt);
        dispatch(
          setEmailVerificationResendAt(
            requestedAt + (error.retryAfterSeconds ?? 60) * 1000,
          ),
        );
      }
      setError(
        verified
          ? "Your email is verified. Unable to load your account; try Continue again."
          : error instanceof ApiError
            ? error.getDisplayMessage()
            : "Unable to send a code. Please try again.",
      );
    } finally {
      if (sessionMatches(userId, controller.signal)) {
        inFlight.current = false;
        setPending(null);
      }
    }
  }

  async function verifyCode() {
    if (!user || inFlight.current) return;
    setError("");
    if (!confirmed && !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    const userId = user.id;
    const controller = new AbortController();
    activeRequest.current = controller;
    inFlight.current = true;
    setPending("confirm");
    let verified = confirmed;
    try {
      if (!verified) {
        await confirmEmailVerification(code, controller.signal);
        if (!sessionMatches(userId, controller.signal)) return;
        verified = true;
        setConfirmed(true);
        setCode("");
      }
      await finishVerification(userId, controller.signal);
    } catch (error) {
      if (!sessionMatches(userId, controller.signal)) return;
      setError(
        verified
          ? "Your email is verified. Unable to load your account; try Continue again."
          : error instanceof ApiError
            ? error.getDisplayMessage()
            : "Unable to verify your email. Please try again.",
      );
    } finally {
      if (sessionMatches(userId, controller.signal)) {
        inFlight.current = false;
        setPending(null);
      }
    }
  }

  async function switchAccount() {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    setPending("sign-out");
    setError("");
    try {
      // Keep the session intact if local token deletion fails, so the user can retry.
      await deleteToken();
      activeRequest.current?.abort();
      dispatch(clearCurrentUser());
      await client.cancelQueries();
      client.clear();
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  if (!user) return <Redirect href="/" />;
  if (user.emailVerified === true)
    return (
      <Redirect
        href={user.faction === null ? "/(onboarding)/faction" : "/(tabs)"}
      />
    );

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <BrandHeader label="ACCOUNT VERIFICATION" />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.text}>
          Verify your email before continuing your ascent.
        </Text>
        <View style={styles.notice}>
          <Text style={styles.label}>YOUR ACCOUNT EMAIL</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.text}>
            Enter the six-digit code from Outrise. Codes expire after 10
            minutes. A new code replaces the previous one.
          </Text>
        </View>
        {confirmed ? (
          <View style={styles.notice}>
            <Text style={styles.successTitle}>EMAIL VERIFIED</Text>
            <Text style={styles.text}>
              Your email is confirmed. Continue to load your account.
            </Text>
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>VERIFICATION CODE</Text>
            <TextInput
              accessibilityLabel="Six-digit email verification code"
              editable={!pending}
              value={code}
              onChangeText={(value) =>
                setCode(value.replace(/\D/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={Colors.dark.textMuted}
              style={[styles.input, styles.code]}
            />
          </View>
        )}
        {notice ? (
          <View style={styles.notice}>
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {notice}
            </Text>
          </View>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={!!pending}
          onPress={verifyCode}
          style={[styles.button, pending && styles.disabled]}
        >
          {pending === "confirm" ? (
            <ActivityIndicator color={Colors.dark.accent} />
          ) : null}
          <Text style={styles.buttonText}>
            {pending === "confirm"
              ? "PLEASE WAIT..."
              : confirmed
                ? "CONTINUE →"
                : "VERIFY EMAIL →"}
          </Text>
        </Pressable>
        {!confirmed ? (
          <Pressable
            accessibilityRole="button"
            disabled={!!pending || resendSeconds > 0}
            onPress={sendCode}
            style={[
              styles.link,
              (!!pending || resendSeconds > 0) && styles.disabled,
            ]}
          >
            <Text style={styles.linkText}>
              {pending === "resend"
                ? "SENDING CODE..."
                : resendSeconds > 0
                  ? `RESEND CODE IN ${resendSeconds}s`
                  : "SEND / RESEND CODE →"}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.helpText}>
            Check your spam folder if you don’t see the email.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!!pending}
            onPress={switchAccount}
            style={[styles.link, pending && styles.disabled]}
          >
            <Text style={styles.linkText}>
              {pending === "sign-out"
                ? "SIGNING OUT..."
                : "USE ANOTHER ACCOUNT →"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!!pending}
            onPress={() => router.push("/report-issue")}
            style={[styles.link, pending && styles.disabled]}
          >
            <Text style={styles.linkText}>REPORT AN ISSUE →</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 32, gap: 20 },
  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: "700",
  },
  text: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 21 },
  email: { color: Colors.dark.text, fontSize: 16, fontWeight: "700" },
  field: { gap: 8 },
  label: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  input: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    padding: 14,
    minHeight: 52,
    fontSize: 16,
  },
  code: { fontSize: 28, letterSpacing: 6, textAlign: "center" },
  button: {
    minHeight: 54,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: 12,
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  link: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  linkText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  error: { color: Colors.dark.danger, fontSize: 13, lineHeight: 19 },
  notice: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    gap: 10,
  },
  successTitle: { color: Colors.dark.success, fontSize: 11, fontWeight: "700" },
  footer: {
    borderTopWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    paddingTop: 20,
    gap: 4,
  },
  helpText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  disabled: { opacity: 0.6 },
});
