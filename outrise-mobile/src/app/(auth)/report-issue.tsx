import { BrandHeader } from "@/components/brand-header";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { ApiError } from "@/api/client";
import { submitIssueReport } from "@/api/issue-reports";

export default function ReportIssueScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [subject, setSubject] = useState("Account access");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (pending) return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (subject.trim().length < 3) {
      setError("Enter a subject of at least 3 characters.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Please describe the issue in at least 10 characters.");
      return;
    }
    setPending(true);
    try {
      await submitIssueReport({ email: email.trim().toLowerCase(), subject: subject.trim(), message: message.trim() });
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof ApiError ? error.getDisplayMessage() : "Unable to submit your report. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.canGoBack() ? router.back() : router.replace("/login")} style={styles.back}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <BrandHeader label="SUPPORT" />
        <Text style={styles.title}>{submitted ? "Report received" : "Report an issue"}</Text>
        {submitted ? <>
          <View style={styles.success}>
            <Text style={styles.successTitle}>SUBMITTED TO THE ADMIN TEAM</Text>
            <Text style={styles.text}>Thank you. The OUTRISE admin team can now review your report.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: "/login", params: { email: email.trim() } })} style={styles.button}>
            <Text style={styles.buttonText}>RETURN TO SIGN IN →</Text>
          </Pressable>
        </> : <>
          <Text style={styles.text}>Having trouble signing in, or think your account was restricted by mistake? Tell the admin team what happened.</Text>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput accessibilityLabel="Email address" editable={!pending} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} placeholder="Email used for your OUTRISE account" placeholderTextColor={Colors.dark.textMuted} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>SUBJECT</Text>
            <TextInput accessibilityLabel="Subject" editable={!pending} value={subject} onChangeText={setSubject} maxLength={120} placeholder="Briefly describe the issue" placeholderTextColor={Colors.dark.textMuted} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>WHAT HAPPENED?</Text>
            <TextInput accessibilityLabel="What happened?" editable={!pending} value={message} onChangeText={setMessage} multiline maxLength={3000} placeholder="Explain the issue and anything that will help us review it." placeholderTextColor={Colors.dark.textMuted} style={[styles.input, styles.message]} />
            <Text style={styles.counter}>{message.length}/3,000</Text>
          </View>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => { void submit(); }} style={[styles.button, pending && styles.disabled]}>
            {pending && <ActivityIndicator color={Colors.dark.text} />}
            <Text style={styles.buttonText}>{pending ? "SUBMITTING..." : "SUBMIT REPORT →"}</Text>
          </Pressable>
        </>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, paddingBottom: 32, gap: 20 },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "700" },
  title: { fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 32, fontWeight: "700" },
  text: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 21 },
  field: { gap: 8 },
  label: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  input: { color: Colors.dark.text, backgroundColor: Colors.dark.backgroundElement, borderWidth: 1, borderColor: Colors.dark.borderStrong, padding: 14, minHeight: 52, fontSize: 14 },
  message: { minHeight: 160, textAlignVertical: "top" },
  counter: { color: Colors.dark.textMuted, fontSize: 11, textAlign: "right" },
  button: { minHeight: 52, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, backgroundColor: Colors.dark.backgroundSelected, borderWidth: 1, borderColor: Colors.dark.accent, padding: 12 },
  buttonText: { color: Colors.dark.text, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  error: { color: Colors.dark.danger, fontSize: 13, lineHeight: 19 },
  success: { padding: 16, borderWidth: 1, borderColor: Colors.dark.success, backgroundColor: Colors.dark.backgroundElement, gap: 10 },
  successTitle: { color: Colors.dark.success, fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
