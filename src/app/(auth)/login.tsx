import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
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

const LOGIN_HERO = require("../../../assets/images/login-hero.jpg");
const GOOGLE_ICON = require("../../../assets/images/google-g-icon.png");

export default function LoginScreen() {
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "telegram" | null
  >(null);

  const { t } = useLanguage();

  const loading = loadingProvider !== null;

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
      setLoadingProvider("google");

      // WEB
      if (Platform.OS === "web") {
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });

        if (error) {
          console.log("Google web OAuth error:", error);
          showMessage(t("login.signInFailed"), error.message);
          setLoadingProvider(null);
        }

        return;
      }

      // NATIVE
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

      // Implicit-flow fallback
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
      setLoadingProvider(null);
    }
  }

  async function handleTelegramSignIn() {
    if (loading) return;

    try {
      Keyboard.dismiss();
      setLoadingProvider("telegram");

      // WEB
      if (Platform.OS === "web") {
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "custom:telegram",
          options: {
            redirectTo,
          },
        });

        if (error) {
          console.log("Telegram web OAuth error:", error);
          showMessage(t("login.signInFailed"), error.message);
          setLoadingProvider(null);
        }

        return;
      }

      // NATIVE
      const redirectTo = Linking.createURL("auth/callback", {
        scheme: "addisfootball",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "custom:telegram",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.log("Telegram OAuth error:", error);
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
          console.log("Telegram code exchange error:", exchangeError);
          showMessage(t("login.signInFailed"), exchangeError.message);
          return;
        }

        router.replace("/");
        return;
      }

      // Implicit-flow fallback
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
            console.log("Telegram session error:", sessionError);
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
      console.log("Telegram sign in error:", error);

      showMessage(
        t("login.somethingWrong"),
        error?.message || t("login.tryAgain"),
      );
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* BACKGROUND PHOTO */}
        <Image
          source={LOGIN_HERO}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* SUBTLE DARK OVERLAY */}
        <View style={styles.overlay} />

        {/* BRAND */}
        <View style={styles.brand}>
          <Text style={styles.brandLine}>Addis</Text>

          <Text style={styles.brandAccent}>Football</Text>

          <Text style={styles.tagline}>Find games. Play!</Text>
        </View>

        {/* LOGIN ACTIONS */}
        <View style={styles.bottomArea}>
          {/* GOOGLE */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("login.continueGoogle")}
            disabled={loading}
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && !loading && styles.googleButtonPressed,
              loading && styles.authButtonDisabled,
            ]}
          >
            {loadingProvider === "google" ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Image
                source={GOOGLE_ICON}
                style={styles.googleGImage}
                resizeMode="contain"
              />
            )}
          </Pressable>

          {/* TELEGRAM */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("login.continueTelegram")}
            disabled={loading}
            onPress={handleTelegramSignIn}
            style={({ pressed }) => [
              styles.telegramButton,
              pressed && !loading && styles.telegramButtonPressed,
              loading && styles.authButtonDisabled,
            ]}
          >
            {loadingProvider === "telegram" ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />

                <Text style={styles.telegramButtonText}>
                  {t("login.connecting")}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="paper-plane"
                  size={21}
                  color="#FFFFFF"
                  style={styles.telegramIcon}
                />

                <Text style={styles.telegramButtonText} numberOfLines={1}>
                  {t("login.continueTelegram")}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#07111F",
  },

  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 10, 16, 0.20)",
  },

  /* BRAND */

  brand: {
    position: "absolute",
    left: 26,
    right: 22,
    top: "23%",
  },

  brandLine: {
    color: "#FFFFFF",
    fontSize: 54,
    lineHeight: 55,
    fontWeight: "900",
    letterSpacing: -2,
  },

  brandAccent: {
    color: COLORS.primary,
    fontSize: 54,
    lineHeight: 56,
    fontWeight: "900",
    letterSpacing: -2,
  },

  tagline: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    marginTop: 10,

    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  /* BOTTOM LOGIN ROW */

  bottomArea: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: Platform.OS === "web" ? 52 : 32,

    flexDirection: "row",
    alignItems: "center",
    gap: 8,

    ...(Platform.OS === "web"
      ? {
          maxWidth: 520,
          width: "calc(100% - 44px)" as any,
          alignSelf: "center",
          left: "50%" as any,
          right: "auto" as any,
          transform: [{ translateX: "-50%" as any }],
        }
      : {}),
  },

  googleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    flexShrink: 0,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",

    elevation: 7,

    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  googleGImage: {
    width: 24,
    height: 24,
  },

  googleButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.94,
  },

  /* TELEGRAM */

  telegramButton: {
    flex: 1,
    height: 56,
    minWidth: 0,

    borderRadius: 18,

    backgroundColor: "#229ED9",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 12,
    gap: 9,

    borderWidth: 1,
    borderColor: "#43C7FF",

    elevation: 7,

    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  telegramButtonPressed: {
    backgroundColor: "#168BC4",
    transform: [{ scale: 0.99 }],
  },

  telegramIcon: {
    flexShrink: 0,
  },

  telegramButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",

    flexShrink: 1,
  },

  /* SHARED */

  authButtonDisabled: {
    opacity: 0.65,
  },
});
