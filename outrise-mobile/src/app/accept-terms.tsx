import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import {
  getLegalDocuments,
  acceptLegalDocuments,
  type LegalVersions,
} from "@/api/legal";
import { getCurrentUser } from "@/api/users";
import { ApiError } from "@/api/client";
import { deleteToken } from "@/storage/auth-storage";
import { clearCurrentUser, setCurrentUser } from "@/store/auth-slice";
import { store, type RootState } from "@/store/store";
import { LegalAcceptance } from "@/components/legal-acceptance";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
export default function AcceptTerms() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const client = useQueryClient();
  const busy = useRef(false);
  const [accepted, setAccepted] = useState<LegalVersions | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["legal-documents"],
    queryFn: getLegalDocuments,
    staleTime: 0,
  });
  const versions = query.data
    ? {
        termsVersion: query.data.terms.version,
        privacyVersion: query.data.privacy.version,
      }
    : null;
  const checked = Boolean(
    versions &&
    accepted?.termsVersion === versions.termsVersion &&
    accepted?.privacyVersion === versions.privacyVersion,
  );
  async function submit() {
    if (!user || !checked || !versions || busy.current) return;
    const userId = user.id;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await acceptLegalDocuments(versions);
      const refreshed = await getCurrentUser();
      if (store.getState().auth.user?.id !== userId) return;
      dispatch(setCurrentUser(refreshed));
      router.replace("/");
    } catch (e) {
      if (store.getState().auth.user?.id === userId)
        setError(
          e instanceof ApiError
            ? e.getDisplayMessage()
            : "Unable to save acceptance. Please try again.",
        );
      void query.refetch();
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function signOut() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await deleteToken();
      dispatch(clearCurrentUser());
      await client.cancelQueries();
      client.clear();
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (!user) return <Redirect href="/login" />;
  if (!user.ageEligibilityConfirmedAt)
    return <Redirect href="/age-eligibility" />;
  if (user.emailVerified !== true) return <Redirect href="/verify-email" />;
  if (user.legalAcceptanceRequired === false) return <Redirect href="/" />;
  return (
    <Screen scroll>
      <View style={styles.page}>
        <Text style={styles.title}>Before you continue</Text>
        <Text style={styles.text}>
          Read the current Terms of Use and Privacy Policy. You can open both
          documents below before making your choice.
        </Text>
        {query.isPending && (
          <Text style={styles.text}>Loading documents...</Text>
        )}
        {query.isError && (
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => {
              void query.refetch();
            }}
          >
            <Text style={styles.text}>Unable to load documents. RETRY →</Text>
          </Pressable>
        )}
        <LegalAcceptance
          checked={checked}
          disabled={pending || !versions || query.isError}
          onChange={(value) => setAccepted(value ? versions : null)}
        />
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!checked || pending || query.isError}
          onPress={() => {
            void submit();
          }}
          style={[styles.button, (!checked || pending) && styles.disabled]}
        >
          <Text style={styles.text}>
            {pending ? "SAVING..." : "ACCEPT AND CONTINUE →"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          style={styles.button}
          onPress={() => router.push("/report-issue")}
        >
          <Text style={styles.text}>CONTACT SUPPORT →</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          style={styles.button}
          onPress={() => router.push("/delete-account")}
        >
          <Text style={styles.text}>DELETE ACCOUNT →</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          style={styles.button}
          onPress={() => {
            void signOut();
          }}
        >
          <Text style={styles.text}>SIGN OUT →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { gap: 18, paddingVertical: 16, paddingBottom: 32 },
  title: { fontFamily: Fonts.display, fontSize: 32, color: Colors.dark.text },
  text: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 22 },
  button: {
    minHeight: 48,
    padding: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },
  disabled: { opacity: 0.5 },
  error: { color: Colors.dark.danger, fontSize: 13 },
});
