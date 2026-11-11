import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { confirmRegistration, resendRegistration } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { saveToken } from "@/storage/auth-storage";
import { clearCurrentUser } from "@/store/auth-slice";
import type { AppDispatch } from "@/store/store";

export default function ConfirmRegistrationScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    requestId?: string;
    resendAt?: string;
  }>();
  const email = typeof params.email === "string" ? params.email : "";
  const requestId =
    typeof params.requestId === "string" ? params.requestId : "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"confirm" | "resend" | null>(null);
  const [resendAt, setResendAt] = useState(
    () => Number(params.resendAt) || Date.now() + 60000,
  );
  const [now, setNow] = useState(Date.now);
  const [confirmed, setConfirmed] = useState(false);
  const token = useRef<string | null>(null);
  const inFlight = useRef(false);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  const client = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    active.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active.current = false;
      request.current?.abort();
      clearInterval(timer);
    };
  }, []);

  async function finish() {
    if (inFlight.current) return;
    if (!token.current && !/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    inFlight.current = true;
    setBusy("confirm");
    setError("");
    setNotice("");
    const controller = new AbortController();
    request.current = controller;
    try {
      if (!token.current) {
        const result = await confirmRegistration(
          { email, requestId, code },
          controller.signal,
        );
        if (!active.current) return;
        token.current = result.token;
        setConfirmed(true);
        setCode("");
      }
      await client.cancelQueries();
      if (!active.current) return;
      await saveToken(token.current);
      if (!active.current) return;
      client.clear();
      dispatch(clearCurrentUser());
      router.replace("/");
    } catch (failure) {
      if (!active.current) return;
      setError(
        token.current
          ? "Your account was created. Tap Continue to retry opening your session."
          : failure instanceof ApiError
            ? failure.getDisplayMessage()
            : "Unable to confirm registration. Please try again.",
      );
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(null);
    }
  }
  async function resend() {
    if (inFlight.current || seconds > 0 || token.current) return;
    inFlight.current = true;
    setBusy("resend");
    setError("");
    setNotice("");
    try {
      const result = await resendRegistration({ email, requestId });
      if (!active.current) return;
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
      setNow(Date.now());
      setCode("");
      setNotice(result.message);
    } catch (failure) {
      if (active.current)
        setError(
          failure instanceof ApiError
            ? failure.getDisplayMessage()
            : "Unable to request another email. Please try again.",
        );
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(null);
    }
  }
  if (!email || !/^[a-f0-9]{48}$/.test(requestId))
    return <Redirect href="/register" />;
  return (
    <Screen scroll keyboardAvoiding bottomInSet={28}>
      <View style={styles.page}>
        <BrandHeader label="REGISTRATION" />
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          Check {email}, including the spam folder. If this address already has
          an account, the email will explain how to sign in. Otherwise, enter
          the code to finish registration. Codes expire after 10 minutes.
        </Text>
        {!confirmed ? (
          <>
            <Text style={styles.label}>EMAIL CODE</Text>
            <TextInput
              value={code}
              onChangeText={(value) =>
                setCode(value.replace(/\D/g, "").slice(0, 6))
              }
              editable={!busy}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={Colors.dark.textMuted}
              accessibilityLabel="Registration verification code"
              style={styles.input}
            />
          </>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text accessibilityRole="alert" style={styles.body}>
            {notice}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={!!busy || (!confirmed && code.length !== 6)}
          onPress={() => {
            void finish();
          }}
          style={[
            styles.button,
            (!!busy || (!confirmed && code.length !== 6)) && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {busy === "confirm"
              ? "PLEASE WAIT..."
              : confirmed
                ? "CONTINUE →"
                : "VERIFY & CREATE ACCOUNT →"}
          </Text>
        </Pressable>
        {!confirmed ? (
          <Pressable
            accessibilityRole="button"
            disabled={!!busy || seconds > 0}
            onPress={() => {
              void resend();
            }}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              {busy === "resend"
                ? "REQUESTING..."
                : seconds > 0
                  ? `RESEND IN ${seconds}s`
                  : "RESEND EMAIL →"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={!!busy}
          onPress={() => router.replace("/login")}
          style={styles.link}
        >
          <Text style={styles.linkText}>SIGN IN INSTEAD →</Text>
        </Pressable>
        {!confirmed ? (
          <Pressable
            accessibilityRole="button"
            disabled={!!busy}
            onPress={() => router.replace("/register")}
            style={styles.link}
          >
            <Text style={styles.linkText}>CHANGE DETAILS / START AGAIN →</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={!!busy}
          onPress={() => router.push("/report-issue")}
          style={styles.link}
        >
          <Text style={styles.linkText}>REPORT AN ISSUE →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: 28, gap: 18 },
  title: { fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 32 },
  body: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 22 },
  label: { color: Colors.dark.textTechnical, fontSize: 11, letterSpacing: 1 },
  input: {
    minHeight: 56,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
    color: Colors.dark.text,
    fontSize: 24,
    letterSpacing: 6,
  },
  button: {
    minHeight: 52,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundSelected,
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  disabled: { opacity: 0.55 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  error: { color: Colors.dark.danger, fontSize: 13, lineHeight: 20 },
});
