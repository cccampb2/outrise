import { BrandHeader } from "@/components/brand-header";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import { register } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { saveToken } from "@/storage/auth-storage";
import { clearCurrentUser } from "@/store/auth-slice";
import type { AppDispatch } from "@/store/store";

export default function RegisterScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();
  const inFlight = useRef(false);
  const createdSession = useRef<{ token: string } | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleShowPassword() {
    setShowPassword((currentValue) => !currentValue);
  }

  async function handleRegister() {
    if (inFlight.current) return;
    setError("");

    if (!createdSession.current) {
      if (!username.trim()) {
        setError("Username is required");
        return;
      }

      if (!email.trim()) {
        setError("Email is required");
        return;
      }

      if (!password) {
        setError("Password is required");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    inFlight.current = true;
    setIsLoading(true);

    try {
      if (!createdSession.current) {
        const data = await register({
          username: username.trim(),
          email: email.trim(),
          password,
        });
        // Preserve the session before local storage/cleanup. Continue can retry
        // without registering the account again or sending another signup email.
        createdSession.current = { token: data.token };
        setAccountCreated(true);
        setPassword("");
        setConfirmPassword("");
      }

      await client.cancelQueries();
      client.clear();
      dispatch(clearCurrentUser());
      await saveToken(createdSession.current.token);
      // The existing entry screen loads /users/me and routes to verification.
      // A temporary connection failure there keeps this token and offers retry.
      router.replace("/");
    } catch (error) {
      if (createdSession.current) {
        setError(
          "Your account was created, but we couldn’t open your session. Tap Continue to try again.",
        );
      } else if (error instanceof ApiError) {
        setError(error.getDisplayMessage());
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to create account");
      }
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        {/* BRAND */}

        <View style={styles.brandHeader}>
          <BrandHeader label="REGISTRATION" style={styles.brandLabelLayout} />

          <Text style={styles.brand}>OUTRISE</Text>

          <View style={styles.brandRule}>
            <View style={styles.brandRuleAccent} />
          </View>
        </View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW_MEMBER</Text>

          <Text style={styles.title}>Create your account</Text>

          <Text style={styles.subtitle}>Your ascent starts here.</Text>
        </View>

        {/* FORM */}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>USERNAME</Text>

            <TextInput
              style={styles.input}
              value={username}
              editable={!isLoading && !accountCreated}
              onChangeText={setUsername}
              placeholder="Choose a username"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>

            <TextInput
              style={styles.input}
              value={email}
              editable={!isLoading && !accountCreated}
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
                editable={!isLoading && !accountCreated}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={Colors.dark.textMuted}
                secureTextEntry={!showPassword}
              />

              <Pressable
                disabled={isLoading || accountCreated}
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

          <View style={styles.field}>
            <Text style={styles.label}>CONFIRM_PASSWORD</Text>

            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={confirmPassword}
              editable={!isLoading && !accountCreated}
              onChangeText={setConfirmPassword}
              placeholder="Enter your password again"
              placeholderTextColor={Colors.dark.textMuted}
              secureTextEntry={!showPassword}
            />
          </View>

          {error ? (
            <View style={styles.errorMessage}>
              <View style={styles.errorTop}>
                <View style={styles.errorDot} />

                <Text style={styles.errorLabel}>REGISTRATION_ERROR</Text>
              </View>

              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={isLoading}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.createButton,
              pressed && !isLoading && styles.createButtonPressed,
              isLoading ? styles.buttonDisabled : null,
            ]}
          >
            <View style={styles.buttonMarker} />

            <Text style={styles.createButtonText}>
              {isLoading
                ? accountCreated
                  ? "OPENING_ACCOUNT..."
                  : "CREATING_ACCOUNT..."
                : accountCreated
                  ? "CONTINUE"
                  : "CREATE_ACCOUNT"}
            </Text>

            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>
        </View>

        {/* LOGIN */}

        <View style={styles.loginArea}>
          <View style={styles.loginRule} />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>

            <Pressable
              disabled={isLoading}
              onPress={() => router.back()}
              style={({ pressed }) => (pressed ? styles.linkPressed : null)}
            >
              <Text style={styles.loginLink}>SIGN_IN →</Text>
            </Pressable>
          </View>
        </View>

        {/* FOOTER */}

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

  container: {
    flexGrow: 1,
    paddingTop: 44,
    paddingBottom: 24,
  },

  /* BRAND */

  brandHeader: {
    marginBottom: 36,
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

  /* CREATE */

  createButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    paddingHorizontal: 14,
    marginTop: 4,
  },

  createButtonPressed: {
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

  createButtonText: {
    flex: 1,
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
    textAlign: "center",
  },

  buttonArrow: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "900",
  },

  /* LOGIN */

  loginArea: {
    marginTop: 28,
  },

  loginRule: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginBottom: 18,
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  loginText: {
    color: Colors.dark.textMuted,
    fontSize: 12,
  },

  loginLink: {
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
    marginTop: 48,
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
