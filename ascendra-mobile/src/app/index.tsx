import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, Text } from "react-native";
import { Redirect } from "expo-router";
import { useDispatch } from "react-redux";
import { getToken, deleteToken } from "@/storage/auth-storage";
import { getCurrentUser } from "@/api/users";
import { setCurrentUser } from "@/store/auth-slice";
import type { AppDispatch } from "@/store/store";
import { Colors } from "@/constants/theme";
import { ApiError } from "@/api/client";

type Destination = "/login" | "/(onboarding)/faction" | "/(tabs)";

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();

  const [destination, setDestination] = useState<Destination | null>(null);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const token = await getToken();

      if (!token) {
        setDestination("/login");
        return;
      }

      try {
        const user = await getCurrentUser();
        dispatch(setCurrentUser(user));

        if (user.faction === null) {
          setDestination("/(onboarding)/faction");
        } else {
          setDestination("/(tabs)");
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await deleteToken();
          setDestination("/login");
          return;
        }
        setSessionError(true);
      }
    }
    restoreSession();
  }, [dispatch]);

  if (sessionError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Unable to connect to Ascendra</Text>
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
});
