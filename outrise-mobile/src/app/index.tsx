import { AppText as Text } from "@/components/app-text";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { getToken, deleteToken } from "@/storage/auth-storage";
import { getCurrentUser } from "@/api/users";
import { setCurrentUser, setAccountRestriction } from "@/store/auth-slice";
import type { AppDispatch, RootState } from "@/store/store";
import { Colors } from "@/constants/theme";
import { ApiError } from "@/api/client";

type Destination = "/login" | "/verify-email" | "/(onboarding)/faction" | "/(tabs)";

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    if (currentUser) return;
    const controller = new AbortController();
    async function restoreSession() {
      const token = await getToken();
      if (controller.signal.aborted) return;

      if (!token) {
        setDestination("/login");
        return;
      }

      try {
        const user = await getCurrentUser(controller.signal);
        if (controller.signal.aborted || token !== await getToken()) return;
        dispatch(setCurrentUser(user));

        if (user.emailVerified !== true) {
          setDestination("/verify-email");
        } else if (user.faction === null) {
          setDestination("/(onboarding)/faction");
        } else {
          setDestination("/(tabs)");
        }
      } catch (error) {
        if (controller.signal.aborted || token !== await getToken()) return;
        if (error instanceof ApiError && error.accountRestriction) {
          await deleteToken();
          dispatch(setAccountRestriction(error.accountRestriction));
          setDestination("/login");
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          await deleteToken();
          setDestination("/login");
          return;
        }
        setSessionError(true);
      }
    }
    void restoreSession().catch(() => {
      if (!controller.signal.aborted) setSessionError(true);
    });
    return () => controller.abort();
  }, [dispatch, currentUser, retryAttempt]);

  if (currentUser) return <Redirect href={currentUser.emailVerified !== true ? "/verify-email" : currentUser.faction === null ? "/(onboarding)/faction" : "/(tabs)"} />;

  if (sessionError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Unable to connect to Outrise</Text>
        <Pressable accessibilityRole="button" onPress={() => {
          setSessionError(false);
          setDestination(null);
          setRetryAttempt((attempt) => attempt + 1);
        }} style={styles.retryButton}>
          <Text style={styles.retryText}>TRY AGAIN →</Text>
        </Pressable>
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }
  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.background,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: { minHeight: 48, justifyContent: "center", padding: 16, marginTop: 12 },
  retryText: { color: Colors.dark.accent, fontSize: 12, fontWeight: "700" },
});
