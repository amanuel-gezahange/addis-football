import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { width } = useWindowDimensions();

  const isDesktopWeb = Platform.OS === "web" && width >= 900;

  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function handleGoogleSignIn() {
    if (loading || googleLoading) return;

    try {
      Keyboard.dismiss();
      setGoogleLoading(true);

      const redirectTo = Linking.createURL("auth/callback", {
        scheme: "addisfootball",
      });

      console.log("Google redirect URL:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.log("Google OAuth error:", error);
        showMessage("Google sign in failed", error.message);
        return;
      }

      if (!data?.url) {
        showMessage(
          "Google sign in failed",
          "Unable to start Google sign in."
        );
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (result.type !== "success" || !result.url) {
        return;
      }

      const returnedUrl = result.url;

      console.log("Google returned to app.");

      /*
       * Supabase can return either:
       *
       * 1. A PKCE authorization code
       * 2. Access/refresh tokens in the URL
       *
       * Handle both so the mobile flow is more robust.
       */

      const parsedUrl = Linking.parse(returnedUrl);

      const code =
        typeof parsedUrl.queryParams?.code === "string"
          ? parsedUrl.queryParams.code
          : null;

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.log(
            "Google code exchange error:",
            exchangeError
          );

          showMessage(
            "Google sign in failed",
            exchangeError.message
          );

          return;
        }

        router.replace("/");
        return;
      }

      /*
       * Some OAuth configurations return tokens after #
       * instead of query parameters.
       */

      const hashIndex = returnedUrl.indexOf("#");

      if (hashIndex !== -1) {
        const hash = returnedUrl.substring(hashIndex + 1);

        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            console.log(
              "Google session error:",
              sessionError
            );

            showMessage(
              "Google sign in failed",
              sessionError.message
            );

            return;
          }

          router.replace("/");
          return;
        }
      }

      /*
       * Check once more in case Supabase already established
       * the session during the OAuth flow.
       */

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
        return;
      }

      showMessage(
        "Google sign in failed",
        "Google completed sign in, but the app could not create a session."
      );
    } catch (error: any) {
      console.log("Google sign in error:", error);

      showMessage(
        "Something went wrong",
        error?.message ||
          "Unable to sign in with Google. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignIn() {
    if (loading || googleLoading) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage(
        "Missing information",
        "Enter your email and password."
      );

      return;
    }

    try {
      Keyboard.dismiss();
      setLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        console.log("Sign in error:", error);

        showMessage(
          "Sign in failed",
          error.message
        );

        return;
      }

      router.replace("/");
    } catch (error: any) {
      console.log("Sign in error:", error);

      showMessage(
        "Something went wrong",
        error?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (loading || googleLoading) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      showMessage(
        "Missing name",
        "Enter your full name."
      );

      return;
    }

    if (!cleanEmail || !password) {
      showMessage(
        "Missing information",
        "Enter your email and password."
      );

      return;
    }

    if (password.length < 6) {
      showMessage(
        "Password too short",
        "Your password must be at least 6 characters."
      );

      return;
    }

    try {
      Keyboard.dismiss();
      setLoading(true);

      const { data, error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,

          options: {
            data: {
              full_name: cleanName,
            },
          },
        });

      if (error) {
        console.log("Sign up error:", error);

        showMessage(
          "Could not create account",
          error.message
        );

        return;
      }

      if (!data.session) {
        showMessage(
          "Check your email",
          "We sent you a confirmation link. Confirm your email, then come back and sign in."
        );

        setMode("signin");
        return;
      }

      router.replace("/");
    } catch (error: any) {
      console.log("Sign up error:", error);

      showMessage(
        "Something went wrong",
        error?.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    Keyboard.dismiss();

    setMode((current) =>
      current === "signin"
        ? "signup"
        : "signin"
    );
  }

  const busy = loading || googleLoading;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View
            style={[
              styles.content,
              isDesktopWeb &&
                styles.contentDesktop,
            ]}
          >
            <View style={styles.logo}>
              <Ionicons
                name="football"
                size={34}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.title}>
              {mode === "signin"
                ? "Welcome back"
                : "Create account"}
            </Text>

            <Text style={styles.subtitle}>
              {mode === "signin"
                ? "Sign in to find a game and play."
                : "Join Addis Football and find your next game."}
            </Text>

            {/* GOOGLE */}

            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed &&
                  !busy &&
                  styles.googleButtonPressed,
                busy &&
                  styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={busy}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>
                  G
                </Text>
              </View>

              <Text
                style={styles.googleButtonText}
              >
                {googleLoading
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </Text>
            </Pressable>

            {/* DIVIDER */}

            <View style={styles.divider}>
              <View
                style={styles.dividerLine}
              />

              <Text
                style={styles.dividerText}
              >
                OR
              </Text>

              <View
                style={styles.dividerLine}
              />
            </View>

            {/* FULL NAME */}

            {mode === "signup" && (
              <>
                <Text style={styles.label}>
                  Full name
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={
                      COLORS.textMuted
                    }
                  />

                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={
                      setFullName
                    }
                    placeholder="Your full name"
                    placeholderTextColor={
                      COLORS.textMuted
                    }
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!busy}
                    returnKeyType="next"
                  />
                </View>
              </>
            )}

            {/* EMAIL */}

            <Text style={styles.label}>
              Email
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textMuted}
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={
                  COLORS.textMuted
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                editable={!busy}
                returnKeyType="next"
              />
            </View>

            {/* PASSWORD */}

            <Text style={styles.label}>
              Password
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textMuted}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={
                  COLORS.textMuted
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={
                  mode === "signin"
                    ? handleSignIn
                    : handleSignUp
                }
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color={
                    COLORS.textMuted
                  }
                />
              </Pressable>
            </View>

            {/* EMAIL BUTTON */}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                  !busy &&
                  styles.primaryButtonPressed,
                busy &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={
                mode === "signin"
                  ? handleSignIn
                  : handleSignUp
              }
              disabled={busy}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {loading
                  ? mode === "signin"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </Text>
            </Pressable>

            {/* SWITCH MODE */}

            <View
              style={
                styles.switchContainer
              }
            >
              <Text
                style={styles.switchText}
              >
                {mode === "signin"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </Text>

              <Pressable
                onPress={switchMode}
                disabled={busy}
              >
                <Text
                  style={
                    styles.switchLink
                  }
                >
                  {mode === "signin"
                    ? "Create account"
                    : "Sign in"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.footer}>
              Find a game. Join. Play.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },

  content: {
    width: "100%",
    paddingHorizontal: 24,
  },

  contentDesktop: {
    maxWidth: 600,
    alignSelf: "center",
  },

  logo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },

  title: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 8,
    marginBottom: 28,
  },

  googleButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DADCE0",
  },

  googleButtonPressed: {
    opacity: 0.88,
  },

  googleIcon: {
    position: "absolute",
    left: 18,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  googleG: {
    fontSize: 21,
    fontWeight: "800",
    color: "#4285F4",
  },

  googleButtonText: {
    color: "#202124",
    fontSize: 16,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginHorizontal: 14,
  },

  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },

  inputContainer: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    height: "100%",
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 12,
  },

  eyeButton: {
    height: "100%",
    justifyContent: "center",
    paddingLeft: 12,
  },

  primaryButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  primaryButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "800",
  },

  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 24,
    gap: 5,
  },

  switchText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  switchLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },

  footer: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 36,
  },
});