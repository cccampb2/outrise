import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { Provider, useSelector } from "react-redux";
import { store, type RootState } from "@/store/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppFonts } from "@/constants/fonts";
import { AccountSessionGuard } from "@/components/account-session-guard";
import { SocketSession } from "@/components/socket-session";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthenticatedStack() {
  const user = useSelector((state: RootState) => state.auth.user);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="delete-account" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !user.ageEligibilityConfirmedAt}>
        <Stack.Screen name="age-eligibility" />
      </Stack.Protected>
      <Stack.Protected
        guard={user?.emailVerified === true && !!user.ageEligibilityConfirmedAt}
      >
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="blocked-users" />
        <Stack.Screen name="friends/index" />
        <Stack.Screen name="messages/index" />
        <Stack.Screen name="messages/announcements" />
        <Stack.Screen name="messages/[conversationId]" />
        <Stack.Screen name="how-it-works" />
        <Stack.Screen name="community-rules" />
        <Stack.Screen name="about" />
        <Stack.Screen name="workout-of-the-week/index" />
        <Stack.Screen name="users/[userId]" />
        <Stack.Screen name="users/achievements" />
        <Stack.Screen name="exercises/[exerciseId]" />
        <Stack.Screen name="exercises/index" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="suggest-feature" />
        <Stack.Protected guard={user?.role === "owner"}>
          <Stack.Screen name="admin/suggestions" />
          <Stack.Screen name="admin/announcements" />
        </Stack.Protected>
        <Stack.Screen name="rankings/factions/[factionSlug]" />
        <Stack.Screen name="rankings/seasons" />
        <Stack.Screen name="workout-session/active" />
        <Stack.Screen name="workout-session/[sessionId]" />
        <Stack.Screen name="admin/users/[userId]" />
        <Stack.Screen name="admin/users/index" />
        <Stack.Screen name="admin/verifications/[verification]" />
        <Stack.Screen name="admin/verifications/index" />
        <Stack.Screen name="admin/issue-reports/[reportId]" />
        <Stack.Screen name="admin/issue-reports/index" />
        <Stack.Screen name="admin/achievements/[id]" />
        <Stack.Screen name="admin/achievements/create" />
        <Stack.Screen name="admin/achievements/index" />
        <Stack.Screen name="admin/exercises/index" />
        <Stack.Screen name="admin/exercises/create" />
        <Stack.Screen name="admin/exercises/[id]" />
        <Stack.Screen name="admin/wotw/index" />
        <Stack.Screen name="admin/wotw/create" />
        <Stack.Screen name="admin/wotw/[id]" />
        <Stack.Screen name="admin/wotw/schedule" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="verifications/submit" />
        <Stack.Screen name="verifications/[verification]" />
        <Stack.Screen name="verifications/index" />
        <Stack.Screen name="workouts/[workoutId]/edit" />
        <Stack.Screen name="workouts/[workoutId]/index" />
        <Stack.Screen name="workouts/create" />
        <Stack.Screen name="workouts/index" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(AppFonts);
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DarkTheme}>
          <AccountSessionGuard />
          <SocketSession />
          <AuthenticatedStack />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}
