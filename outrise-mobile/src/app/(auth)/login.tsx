import { BrandHeader } from "@/components/brand-header";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { useRef, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { login } from "@/api/auth";
import { saveToken, deleteToken } from "@/storage/auth-storage";
import { getCurrentUser } from "@/api/users";
import {
  setCurrentUser,
  clearAccountNotice,
  clearCurrentUser,
} from "@/store/auth-slice";
import type { AppDispatch, RootState } from "@/store/store";
import { ApiError, accountRestrictionMessage } from "@/api/client";

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();
  const inFlight = useRef(false);
  const accountNotice = useSelector(
    (state: RootState) => state.auth.accountNotice,
  );

  const params = useLocalSearchParams<{
    email?: string;
    registered?: string;
    passwordReset?: string;
    sessionExpired?: string;
  }>();

  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorTitle, setErrorTitle] = useState("ACCESS_ERROR");
  const displayedError =
    error ||
    (accountNotice
      ? accountRestrictionMessage(accountNotice)
      : params.sessionExpired === "true"
        ? "Your session ended. Sign in again."
        : "");
  const displayedErrorTitle = error
    ? errorTitle
    : accountNotice?.accountStatus === "suspended"
      ? "ACCOUNT_SUSPENDED"
      : accountNotice
        ? "ACCOUNT_BANNED"
        : "SESSION_EXPIRED";

  function handleShowPassword() {
    setShowPassword((currentValue) => !currentValue);
  }

  async function handleLogin() {
    if (inFlight.current) return;
    setError("");
    setErrorTitle("ACCESS_ERROR");
    dispatch(clearAccountNotice());

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    inFlight.current = true;
    setIsLoading(true);
    let tokenSaved = false;

    try {
      const data = await login({
        email,
        password,
      });

      await client.cancelQueries();
      client.clear();
      dispatch(clearCurrentUser());
      await saveToken(data.token);
      tokenSaved = true;

      const user = await getCurrentUser();

      dispatch(setCurrentUser(user));

      if (user.emailVerified !== true) {
        router.replace("/verify-email");
      } else if (user.faction === null) {
        router.replace("/(onboarding)/faction");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      if (tokenSaved) await deleteToken().catch(() => {});
      if (error instanceof ApiError && error.accountRestriction) {
        setError(accountRestrictionMessage(error.accountRestriction));
        setErrorTitle(error.accountRestriction.code);
      } else if (error instanceof Error) {
        setError(error.message);
      }

      console.error(error);
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Screen keyboardAvoiding scroll>
      <View style={styles.container}>
        {/* BRAND */}

        <View style={styles.brandHeader}>
          <BrandHeader label="ACCESS" style={styles.brandLabelLayout} />

          <Text style={styles.brand}>OUTRISE</Text>

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

        {params.registered === "true" || params.passwordReset === "true" ? (
          <View style={styles.successMessage}>
            <View style={styles.successTop}>
              <View style={styles.successDot} />

              <Text style={styles.successLabel}>
                {params.passwordReset === "true"
                  ? "PASSWORD_UPDATED"
                  : "ACCOUNT_CREATED"}
              </Text>
            </View>

            <Text style={styles.successText}>
              {params.passwordReset === "true"
                ? "Your password has been reset. Sign in with your new password."
                : "Your account is ready. Check your email for a verification code, then sign in to continue."}
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
              editable={!isLoading}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                editable={!isLoading}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.dark.textMuted}
                secureTextEntry={!showPassword}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                disabled={isLoading}
                onPress={handleShowPassword}
                style={({ pressed }) => [
                  styles.passwordShow,
                  pressed ? styles.iconPressed : null,
                ]}
              >
                <AntDesign
                  name={showPassword ? "eye" : "eye-invisible"}
                  size={21}
                  color={Colors.dark.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() =>
              router.push({
                pathname: "/forgot-password",
                params: { email: email.trim() },
              })
            }
            style={({ pressed }) => [
              styles.reportButton,
              pressed && styles.linkPressed,
            ]}
          >
            <Text style={styles.reportText}>FORGOT PASSWORD? →</Text>
          </Pressable>

          {displayedError ? (
            <View style={styles.errorMessage}>
              <View style={styles.errorTop}>
                <View style={styles.errorDot} />

                <Text style={styles.errorLabel}>{displayedErrorTitle}</Text>
              </View>

              <Text style={styles.errorText}>{displayedError}</Text>
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

        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() =>
            router.push({
              pathname: "/report-issue",
              params: { email: email.trim() },
            })
          }
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.linkPressed,
          ]}
        >
          <Text style={styles.reportText}>REPORT AN ISSUE →</Text>
        </Pressable>

        {/* REGISTER */}

        <View style={styles.registerArea}>
          <View style={styles.registerRule} />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to Outrise?</Text>

            <Pressable
              disabled={isLoading}
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

          <Text style={styles.footerWordmark}>OUTRISE</Text>

          <View style={styles.footerLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 14,
  },

  reportButton: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  reportText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  container: {
    flexGrow: 1,
    paddingTop: 54,
    paddingBottom: 24,
  },

  /* BRAND */

  brandHeader: {
    marginBottom: 42,
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
    fontFamily: Fonts.display,
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

  passwordContainer: {
    position: "relative",
  },

  passwordInput: {
    paddingRight: 52,
  },

  passwordShow: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  iconPressed: {
    opacity: 0.5,
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
