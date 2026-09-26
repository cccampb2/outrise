import { useState } from "react";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";

import { Screen } from "@/components/screen";
import { Colors } from "@/constants/theme";
import { login } from "@/api/auth";
import { saveToken } from "@/storage/auth-storage";
import { getCurrentUser } from "@/api/users";
import { setCurrentUser } from "@/store/auth-slice";
import type { AppDispatch } from "@/store/store";

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const params = useLocalSearchParams<{
    email?: string;
    registered?: string;
  }>();

  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);

    try {
      const data = await login({
        email,
        password,
      });

      await saveToken(data.token);

      const user = await getCurrentUser();

      dispatch(setCurrentUser(user));

      if (data.user.faction === null) {
        router.replace("/(onboarding)/faction");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }

      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen keyboardAvoiding scroll>
      <View style={styles.container}>
        {/* BRAND */}

        <View style={styles.brandHeader}>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />

            <Text style={styles.systemStatusText}>ASCENDRA // ACCESS</Text>
          </View>

          <Text style={styles.brand}>ASCENDRA</Text>

          <View style={styles.brandRule}>
            <View style={styles.brandRuleAccent} />
          </View>
        </View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>MEMBER_ACCESS</Text>

          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.subtitle}>Sign in to continue your ascent.</Text>
        </View>

        {/* REGISTRATION SUCCESS */}

        {params.registered === "true" ? (
          <View style={styles.successMessage}>
            <View style={styles.successTop}>
              <View style={styles.successDot} />

              <Text style={styles.successLabel}>ACCOUNT_CREATED</Text>
            </View>

            <Text style={styles.successText}>
              Your account is ready. Sign in to continue.
            </Text>
          </View>
        ) : null}

        {/* FORM */}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={Colors.dark.textMuted}
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorMessage}>
              <View style={styles.errorTop}>
                <View style={styles.errorDot} />

                <Text style={styles.errorLabel}>ACCESS_ERROR</Text>
              </View>

              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isLoading}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && !isLoading && styles.signInButtonPressed,
              isLoading ? styles.buttonDisabled : null,
            ]}
          >
            <View style={styles.buttonMarker} />

            <Text style={styles.signInButtonText}>
              {isLoading ? "SIGNING_IN..." : "SIGN_IN"}
            </Text>

            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>
        </View>

        {/* REGISTER */}

        <View style={styles.registerArea}>
          <View style={styles.registerRule} />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to Ascendra?</Text>

            <Pressable
              onPress={() => router.push("/register")}
              style={({ pressed }) => [pressed ? styles.linkPressed : null]}
            >
              <Text style={styles.registerLink}>CREATE_ACCOUNT →</Text>
            </Pressable>
          </View>
        </View>

        {/* BRAND FOOTER */}

        <View style={styles.brandFooter}>
          <View style={styles.footerLine} />

          <Text style={styles.footerWordmark}>ASCENDRA</Text>

          <View style={styles.footerLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 54,
    paddingBottom: 24,
  },

  /* BRAND */

  brandHeader: {
    marginBottom: 42,
  },

  systemStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },

  systemStatusText: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  brand: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 5,
  },

  brandRule: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 14,
  },

  brandRuleAccent: {
    position: "absolute",
    left: 0,
    top: -1,
    width: 44,
    height: 2,
    backgroundColor: Colors.dark.accent,
  },

  /* HEADER */

  header: {
    marginBottom: 28,
  },

  eyebrow: {
    color: Colors.dark.accent,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 6,
  },

  title: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },

  /* SUCCESS */

  successMessage: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    padding: 14,
    marginBottom: 20,
  },

  successTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },

  successDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },

  successLabel: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  successText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  /* FORM */

  form: {
    gap: 18,
  },

  field: {
    gap: 7,
  },

  label: {
    color: Colors.dark.textTechnical,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  input: {
    minHeight: 52,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    fontSize: 15,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  /* ERROR */

  errorMessage: {
    backgroundColor: Colors.dark.dangerSurface,
    borderWidth: 1,
    borderColor: Colors.dark.dangerBorder,
    padding: 12,
  },

  errorTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },

  errorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.danger,
  },

  errorLabel: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  errorText: {
    color: Colors.dark.danger,
    fontSize: 12,
    lineHeight: 18,
  },

  /* BUTTON */

  signInButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 14,
    marginTop: 4,
  },

  signInButtonPressed: {
    backgroundColor: Colors.dark.backgroundDeep,
    transform: [{ scale: 0.99 }],
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonMarker: {
    width: 3,
    height: 18,
    backgroundColor: Colors.dark.accent,
    marginRight: 12,
  },

  signInButtonText: {
    flex: 1,
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    textAlign: "center",
  },

  buttonArrow: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "900",
  },

  /* REGISTER */

  registerArea: {
    marginTop: 28,
  },

  registerRule: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginBottom: 18,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  registerText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
  },

  registerLink: {
    color: Colors.dark.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  linkPressed: {
    opacity: 0.55,
  },

  /* FOOTER */

  brandFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 56,
    paddingHorizontal: 20,
  },

  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.borderSubtle,
  },

  footerWordmark: {
    color: Colors.dark.textDim,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 4,
  },
});
