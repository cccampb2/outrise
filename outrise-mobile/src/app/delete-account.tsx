import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { Screen } from "@/components/screen";
import { BrandHeader } from "@/components/brand-header";
import { Colors, Fonts } from "@/constants/theme";
import { requestAccountDeletion } from "@/api/account-deletion";
import { ApiError } from "@/api/client";
import { deleteToken } from "@/storage/auth-storage";
import { clearCurrentUser } from "@/store/auth-slice";
import { socket } from "@/api/socket";
import { store, type AppDispatch, type RootState } from "@/store/store";

export default function DeleteAccountScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), [user?.id]);
  const accepted = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  async function remove() {
    if (busy.current || !user) return;
    const userId = user.id;
    const controller = new AbortController();
    activeRequest.current = controller;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      if (!accepted.current) {
        const result = await requestAccountDeletion(password, confirmation);
        if (
          controller.signal.aborted ||
          store.getState().auth.user?.id !== userId
        )
          return;
        accepted.current = true;
        setSubmitted(true);
        setPassword("");
        Alert.alert(
          result.status === "completed"
            ? "Account deleted"
            : "Deletion requested",
          result.status === "completed"
            ? "Your account has been deleted. Conversations keep the other member’s messages; your message content is removed."
            : "Your account is disabled. Cleanup will retry automatically if an uploaded file or database operation could not be removed yet.",
        );
      }
      socket.disconnect();
      await deleteToken();
      await client.cancelQueries();
      client.clear();
      if (store.getState().auth.user?.id !== userId) return;
      dispatch(clearCurrentUser());
      router.replace("/login");
    } catch (error) {
      if (
        controller.signal.aborted ||
        store.getState().auth.user?.id !== userId
      )
        return;
      setError(
        accepted.current
          ? "Your deletion was accepted. Tap Continue to finish signing out."
          : error instanceof ApiError
            ? error.getDisplayMessage()
            : "Unable to confirm deletion. If the request reached the server, your account may already be disabled. Try signing in to check its status.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function confirm() {
    if (pending) return;
    if (accepted.current) {
      void remove();
      return;
    }
    if (!password || confirmation !== "DELETE") {
      setError("Enter your password and type DELETE to confirm.");
      return;
    }
    Alert.alert(
      "Permanently delete your account?",
      "This cannot be undone. Your workouts, achievements, performance records, uploads, friendships, and faction contributions will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            void remove();
          },
        },
      ],
    );
  }
  if (!user) return <Redirect href="/" />;
  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.page}>
        <Pressable
          onPress={() => router.back()}
          disabled={pending || submitted}
          style={styles.linkButton}
        >
          <Text style={styles.link}>← BACK</Text>
        </Pressable>
        <BrandHeader label="ACCOUNT" />
        <Text style={styles.title}>Delete account</Text>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>PERMANENT DELETION</Text>
          <Text style={styles.text}>
            Your profile, workouts, achievements, performance records,
            verification uploads, friendships, and season contributions will be
            removed.
          </Text>
          <Text style={styles.text}>
            Shared chats will close. Your message content will be removed; the
            other member’s messages remain. Published Outrise announcements and
            WOTW templates remain without your creator identity.
          </Text>
          <Text style={styles.text}>
            You will be signed out immediately after the request is accepted.
            Cleanup automatically retries if a step fails.
          </Text>
        </View>
        <Text style={styles.label}>CURRENT PASSWORD</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          editable={!pending && !submitted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor={Colors.dark.textMuted}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowPassword((value) => !value)}
          style={styles.linkButton}
        >
          <Text style={styles.link}>
            {showPassword ? "HIDE PASSWORD" : "SHOW PASSWORD"}
          </Text>
        </Pressable>
        <Text style={styles.label}>TYPE DELETE TO CONFIRM</Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          editable={!pending && !submitted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          placeholder="DELETE"
          placeholderTextColor={Colors.dark.textMuted}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={confirm}
          disabled={pending}
          style={[styles.button, pending && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {pending
              ? "PROCESSING..."
              : submitted
                ? "CONTINUE →"
                : "DELETE MY ACCOUNT"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { paddingTop: 20, paddingBottom: 40, gap: 16 },
  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 34,
    fontWeight: "900",
  },
  warning: {
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    backgroundColor: Colors.dark.dangerSurface,
    padding: 16,
    gap: 12,
  },
  warningTitle: {
    color: Colors.dark.danger,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  text: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 22 },
  label: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    color: Colors.dark.text,
    padding: 15,
    fontSize: 16,
  },
  linkButton: { minHeight: 44, justifyContent: "center" },
  link: { color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "700" },
  button: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.dark.danger,
    backgroundColor: Colors.dark.dangerSurface,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonText: {
    color: Colors.dark.danger,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  disabled: { opacity: 0.5 },
  error: { color: Colors.dark.danger, fontSize: 14, lineHeight: 21 },
});
