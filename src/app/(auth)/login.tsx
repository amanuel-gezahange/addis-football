import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function handleGoogleSignIn() {
    if (loading) return;

    try {
      Keyboard.dismiss();
      setLoading(true);

      const redirectTo = Linking.createURL("auth/callback", {
        scheme: "addisfootball",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.log("Google OAuth error:", error);

        showMessage(t("login.signInFailed"), error.message);

        return;
      }

      if (!data?.url) {
        showMessage(t("login.signInFailed"), t("login.unableToStart"));

        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type !== "success" || !result.url) {
        return;
      }

      const returnedUrl = result.url;

      const parsedUrl = Linking.parse(returnedUrl);

      const code =
        typeof parsedUrl.queryParams?.code === "string"
          ? parsedUrl.queryParams.code
          : null;

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.log("Google code exchange error:", exchangeError);

          showMessage(t("login.signInFailed"), exchangeError.message);

          return;
        }

        router.replace("/");
        return;
      }

      const hashIndex = returnedUrl.indexOf("#");

      if (hashIndex !== -1) {
        const hash = returnedUrl.substring(hashIndex + 1);

        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");

        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.log("Google session error:", sessionError);

            showMessage(t("login.signInFailed"), sessionError.message);

            return;
          }

          router.replace("/");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
        return;
      }

      showMessage(t("login.signInFailed"), t("login.sessionFailed"));
    } catch (error: any) {
      console.log("Google sign in error:", error);

      showMessage(
        t("login.somethingWrong"),
        error?.message || t("login.tryAgain"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        {/* LANGUAGE */}

        <View style={styles.languageContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="English"
            onPress={() => setLanguage("en")}
            style={[
              styles.languageButton,
              language === "en" && styles.languageButtonActive,
            ]}
          >
            <Text
              style={[
                styles.languageText,
                language === "en" && styles.languageTextActive,
              ]}
            >
              English
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="አማርኛ"
            onPress={() => setLanguage("am")}
            style={[
              styles.languageButton,
              language === "am" && styles.languageButtonActive,
            ]}
          >
            <Text
              style={[
                styles.languageText,
                language === "am" && styles.languageTextActive,
              ]}
            >
              አማርኛ
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Oromoo"
            onPress={() => setLanguage("om")}
            style={[
              styles.languageButton,
              language === "om" && styles.languageButtonActive,
            ]}
          >
            <Text
              style={[
                styles.languageText,
                language === "om" && styles.languageTextActive,
              ]}
            >
              Oromoo
            </Text>
          </Pressable>
        </View>

        {/* MAIN CONTENT */}

        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="football" size={38} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>Addis Football</Text>

            <Text style={styles.subtitle}>{t("login.tagline")}</Text>
          </View>

          {/* GOOGLE */}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.continueGoogle")}
              disabled={loading}
              onPress={handleGoogleSignIn}
              style={({ pressed }) => [
                styles.googleButton,

                pressed && !loading && styles.googleButtonPressed,

                loading && styles.googleButtonDisabled,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#202124" />

                  <Text style={styles.googleButtonText}>
                    {t("login.connecting")}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleG}>G</Text>
                  </View>

                  <Text style={styles.googleButtonText}>
                    {t("login.continueGoogle")}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={styles.helperText}>{t("login.helper")}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Addis Football</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },

  languageContainer: {
    position: "absolute",
    top: 14,
    left: 20,
    right: 20,
    zIndex: 10,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,
  },

  languageButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    paddingVertical: 8,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "transparent",
  },

  languageButtonActive: {
    backgroundColor: COLORS.surfaceAlt,

    borderColor: COLORS.border,
  },

  languageText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  languageTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    justifyContent: "center",
  },

  brand: {
    alignItems: "center",
    marginBottom: 52,
  },

  logo: {
    width: 82,
    height: 82,
    borderRadius: 41,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.surfaceAlt,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 24,
  },

  title: {
    color: COLORS.text,

    fontSize: 34,
    lineHeight: 42,

    fontWeight: "800",
    letterSpacing: -0.8,

    textAlign: "center",
  },

  subtitle: {
    color: COLORS.textSecondary,

    fontSize: 17,
    lineHeight: 25,

    textAlign: "center",

    marginTop: 8,
  },

  actions: {
    width: "100%",
  },

  googleButton: {
    width: "100%",
    minHeight: 58,

    borderRadius: 16,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "#DADCE0",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 20,
  },

  googleButtonPressed: {
    opacity: 0.88,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  googleButtonDisabled: {
    opacity: 0.7,
  },

  googleIcon: {
    position: "absolute",
    left: 20,

    width: 26,
    height: 26,

    alignItems: "center",
    justifyContent: "center",
  },

  googleG: {
    color: "#4285F4",
    fontSize: 21,
    fontWeight: "800",
  },

  googleButtonText: {
    color: "#202124",

    fontSize: 16,
    fontWeight: "700",

    marginLeft: 10,
  },

  helperText: {
    color: COLORS.textMuted,

    fontSize: 13,
    lineHeight: 20,

    textAlign: "center",

    marginTop: 16,

    paddingHorizontal: 20,
  },

  footer: {
    color: COLORS.textMuted,

    fontSize: 12,

    textAlign: "center",
  },
});