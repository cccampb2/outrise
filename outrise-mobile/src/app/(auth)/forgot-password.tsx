import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { BrandHeader } from "@/components/brand-header";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { requestPasswordReset, resetPassword } from "@/api/auth";
import { ApiError } from "@/api/client";
import { deleteToken } from "@/storage/auth-storage";
import { clearCurrentUser } from "@/store/auth-slice";
import type { AppDispatch } from "@/store/store";

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const inFlight = useRef(false);
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timeout = setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [resendSeconds]);

  function validEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  }

  async function sendCode() {
    if (inFlight.current || resendSeconds > 0) return;
    setError("");
    if (!validEmail()) return;
    inFlight.current = true;
    setPending(true);
    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setNotice(result.message);
      setResendSeconds(result.resendAfterSeconds);
      setCode("");
      setStep("reset");
    } catch (error) {
      setError(error instanceof ApiError ? error.getDisplayMessage() : "Unable to request a code. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function submitPassword() {
    if (inFlight.current) return;
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      await resetPassword({ email: email.trim().toLowerCase(), code, password, confirmPassword });
      setCode("");
      setPassword("");
      setConfirmPassword("");
      setStep("done");
      dispatch(clearCurrentUser());
      await client.cancelQueries();
      client.clear();
      // The server already revoked this token. A local storage failure cannot
      // change the successful reset or restore access with the old token.
      await deleteToken().catch(() => {});
    } catch (error) {
      setError(error instanceof ApiError ? error.getDisplayMessage() : "Unable to reset your password. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.replace({ pathname: "/login", params: { email: email.trim() } })} style={styles.link}>
          <Text style={styles.linkText}>← SIGN IN</Text>
        </Pressable>
        <BrandHeader label="ACCOUNT RECOVERY" />
        <Text style={styles.title}>{step === "done" ? "Password reset" : step === "reset" ? "Choose a new password" : "Forgot password?"}</Text>

        {step === "done" ? <>
          <View style={styles.notice}>
            <Text style={styles.successTitle}>PASSWORD UPDATED</Text>
            <Text style={styles.text}>Your new password is ready. Sign in again to continue.</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.replace({ pathname: "/login", params: { email: email.trim(), passwordReset: "true" } })} style={styles.button}>
            <Text style={styles.buttonText}>RETURN TO SIGN IN →</Text>
          </Pressable>
        </> : <>
          <Text style={styles.text}>{step === "email" ? "Enter the email for your Outrise account. We’ll send a six-digit code to help you reset your password." : `Enter the code sent to ${email.trim()}. Codes expire after 10 minutes. A new code replaces the previous one.`}</Text>
          {step === "email" ? <View style={styles.field}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput accessibilityLabel="Email address" editable={!pending} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} maxLength={254} placeholder="Your account email" placeholderTextColor={Colors.dark.textMuted} style={styles.input} />
          </View> : <>
            {notice ? <View style={styles.notice}><Text style={styles.text}>{notice}</Text></View> : null}
            <View style={styles.field}>
              <Text style={styles.label}>RESET CODE</Text>
              <TextInput accessibilityLabel="Six-digit reset code" editable={!pending} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" autoCorrect={false} maxLength={6} placeholder="000000" placeholderTextColor={Colors.dark.textMuted} style={[styles.input, styles.code]} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <TextInput accessibilityLabel="New password" editable={!pending} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={72} placeholder="At least 8 characters" placeholderTextColor={Colors.dark.textMuted} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
              <TextInput accessibilityLabel="Confirm new password" editable={!pending} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={72} placeholder="Enter your new password again" placeholderTextColor={Colors.dark.textMuted} style={styles.input} />
            </View>
          </>}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={pending || (step === "email" && resendSeconds > 0)} onPress={() => { void (step === "email" ? sendCode() : submitPassword()); }} style={[styles.button, (pending || (step === "email" && resendSeconds > 0)) && styles.disabled]}>
            {pending ? <ActivityIndicator color={Colors.dark.text} /> : null}
            <Text style={styles.buttonText}>{pending ? "PLEASE WAIT..." : step === "email" ? (resendSeconds > 0 ? `SEND CODE IN ${resendSeconds}s` : "SEND RESET CODE →") : "RESET PASSWORD →"}</Text>
          </Pressable>
          {step === "reset" ? <>
            <Pressable accessibilityRole="button" disabled={pending || resendSeconds > 0} onPress={() => { void sendCode(); }} style={[styles.link, (pending || resendSeconds > 0) && styles.disabled]}>
              <Text style={styles.linkText}>{resendSeconds > 0 ? `RESEND CODE IN ${resendSeconds}s` : "RESEND CODE →"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => { setStep("email"); setCode(""); setPassword(""); setConfirmPassword(""); setError(""); setNotice(""); }} style={styles.link}>
              <Text style={styles.linkText}>USE A DIFFERENT EMAIL</Text>
            </Pressable>
          </> : <Pressable accessibilityRole="button" disabled={pending} onPress={() => { setError(""); if (validEmail()) { setNotice(""); setStep("reset"); } }} style={styles.link}>
            <Text style={styles.linkText}>ALREADY HAVE A CODE? →</Text>
          </Pressable>}
        </>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, paddingBottom: 32, gap: 20 },
  title: { fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 32, fontWeight: "700" },
  text: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 21 },
  field: { gap: 8 },
  label: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  input: { color: Colors.dark.text, backgroundColor: Colors.dark.backgroundElement, borderWidth: 1, borderColor: Colors.dark.borderStrong, padding: 14, minHeight: 52, fontSize: 16 },
  code: { fontSize: 28, letterSpacing: 6, textAlign: "center" },
  button: { minHeight: 54, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, backgroundColor: Colors.dark.backgroundSelected, borderWidth: 1, borderColor: Colors.dark.accent, padding: 12 },
  buttonText: { color: Colors.dark.text, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  link: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "700" },
  error: { color: Colors.dark.danger, fontSize: 13, lineHeight: 19 },
  notice: { padding: 16, borderWidth: 1, borderColor: Colors.dark.borderStrong, backgroundColor: Colors.dark.backgroundElement, gap: 10 },
  successTitle: { color: Colors.dark.success, fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
