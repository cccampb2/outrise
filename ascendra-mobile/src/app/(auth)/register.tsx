import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";

import { register } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";

export default function RegisterScreen() {
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
    setError("");

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

    setIsLoading(true);

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      router.replace({
        pathname: "/login",
        params: {
          email: email.trim(),
          registered: "true",
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.getDisplayMessage());
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to create account");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        {/* BRAND */}

        <View style={styles.brandHeader}>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />

            <Text style={styles.systemStatusText}>
              ASCENDRA // REGISTRATION
            </Text>
          </View>

          <Text style={styles.brand}>ASCENDRA</Text>

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
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={Colors.dark.textMuted}
                secureTextEntry={!showPassword}
              />

              <Pressable
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
              {isLoading ? "CREATING_ACCOUNT..." : "CREATE_ACCOUNT"}
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
    paddingTop: 44,
    paddingBottom: 24,
  },

  /* BRAND */

  brandHeader: {
    marginBottom: 36,
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
