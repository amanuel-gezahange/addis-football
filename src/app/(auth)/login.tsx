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
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { Language, languageOptions } from "../../i18n";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const LOGIN_HERO = require("../../../assets/images/login-hero.png");

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function changeLanguage(nextLanguage: Language) {
    await setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  }

  function currentLanguageLabel() {
    return (
      languageOptions.find((option) => option.code === language)?.label ||
      language.toUpperCase()
    );
  }

  async function handleGoogleSignIn() {
    if (loading) return;

    try {
      Keyboard.dismiss();
      setLoading(true);

      // WEB:
      // Use the current website origin for the callback.
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

          setLoading(false);
        }

        // On success Supabase redirects the browser.
        return;
      }

      // ANDROID / NATIVE:
      // Keep using the Addis Football deep link.
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

      // PKCE response
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

      // Implicit response fallback
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
      // On web, successful OAuth navigates away.
      // This mainly resets Android or failed web attempts.
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* HERO */}

        <View style={styles.hero}>
          <Image
            source={LOGIN_HERO}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.heroDarkOverlay} />

          {/* LANGUAGE */}

          <View style={styles.languageArea}>
            <Pressable
              style={styles.languageButton}
              onPress={() => setLanguageMenuOpen((open) => !open)}
              accessibilityRole="button"
            >
              <Ionicons name="globe-outline" size={19} color="#FFFFFF" />

              <Text style={styles.languageButtonText}>
                {currentLanguageLabel()}
              </Text>

              <Ionicons
                name={languageMenuOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color="#FFFFFF"
              />
            </Pressable>

            {languageMenuOpen && (
              <View style={styles.languageMenu}>
                {languageOptions.map((option) => {
                  const selected = language === option.code;

                  return (
                    <Pressable
                      key={option.code}
                      style={[
                        styles.languageOption,
                        selected && styles.languageOptionSelected,
                      ]}
                      onPress={() => changeLanguage(option.code)}
                    >
                      <View style={styles.languageOptionTextWrap}>
                        <Text
                          style={[
                            styles.languageOptionText,
                            selected && styles.languageOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>

                        <Text
                          style={[
                            styles.languageOptionCode,
                            selected && styles.languageOptionCodeSelected,
                          ]}
                        >
                          {option.code.toUpperCase()}
                        </Text>
                      </View>

                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color={COLORS.primary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* BRAND */}

          <View style={styles.heroBrand}>
            <Text style={styles.brandLine}>Addis</Text>

            <Text style={styles.brandAccent}>Football</Text>

            <Text style={styles.heroTagline}>Our city. Our game.</Text>
          </View>
        </View>

        {/* AUTH AREA */}

        <View style={styles.authArea}>
          {/* GOOGLE */}

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

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#8A949D"
                  style={styles.googleChevron}
                />
              </>
            )}
          </Pressable>

          {/* VALUE PROPOSITION */}

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name="people-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.featureTitle}>Real</Text>

              <Text style={styles.featureText}>players</Text>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.featureTitle}>Weekly</Text>

              <Text style={styles.featureText}>games</Text>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name="location-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.featureTitle}>Across</Text>

              <Text style={styles.featureText}>Addis</Text>
            </View>
          </View>

          <Text style={styles.helperText}>{t("login.helper")}</Text>

          <Text style={styles.footer}>Addis Football</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  scrollView: {
    flex: 1,
    backgroundColor: "#07111F",
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#07111F",
  },

  hero: {
    width: "100%",
    height: 470,
    position: "relative",
    overflow: "hidden",
  },

  heroImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },

  heroDarkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(4, 13, 22, 0.24)",
  },

  languageArea: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 20,
    alignItems: "flex-end",
  },

  languageButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 24,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,

    backgroundColor: "rgba(7, 17, 31, 0.72)",

    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },

  languageButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  languageMenu: {
    width: 190,
    marginTop: 8,
    padding: 7,

    borderRadius: 16,

    backgroundColor: "#FFFFFF",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 8,
  },

  languageOption: {
    minHeight: 47,
    paddingHorizontal: 11,
    borderRadius: 11,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  languageOptionSelected: {
    backgroundColor: "#EAF9FE",
  },

  languageOptionTextWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  languageOptionText: {
    color: "#17202A",
    fontSize: 14,
    fontWeight: "700",
  },

  languageOptionTextSelected: {
    color: "#07111F",
  },

  languageOptionCode: {
    color: "#98A2AA",
    fontSize: 9,
    fontWeight: "800",
  },

  languageOptionCodeSelected: {
    color: "#568091",
  },

  heroBrand: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 34,
  },

  brandLine: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1.8,

    textShadowColor: "rgba(0, 0, 0, 0.32)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 8,
  },

  brandAccent: {
    color: COLORS.primary,
    fontSize: 44,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1.8,

    textShadowColor: "rgba(0, 0, 0, 0.32)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 8,
  },

  heroTagline: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 11,

    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 5,
  },

  ethiopianTagline: {
    color: "rgba(255, 255, 255, 0.84)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },

  authArea: {
    flex: 1,

    width: "100%",
    maxWidth: 560,
    alignSelf: "center",

    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,

    backgroundColor: "#07111F",
  },

  welcomeText: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    textAlign: "center",
  },

  authSubtitle: {
    color: "#8FA1AF",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",

    marginTop: 5,
    marginBottom: 20,
  },

  googleButton: {
    width: "100%",
    minHeight: 60,

    borderRadius: 17,

    backgroundColor: "#FFFFFF",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 52,

    borderWidth: 1,
    borderColor: "#E5E9EC",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,

    elevation: 4,
  },

  googleButtonPressed: {
    backgroundColor: "#F4F6F7",
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  googleButtonDisabled: {
    opacity: 0.65,
  },

  googleIcon: {
    position: "absolute",
    left: 20,

    width: 28,
    height: 28,

    alignItems: "center",
    justifyContent: "center",
  },

  googleG: {
    color: "#4285F4",
    fontSize: 22,
    fontWeight: "900",
  },

  googleButtonText: {
    color: "#17202A",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  googleChevron: {
    position: "absolute",
    right: 18,
  },

  features: {
    minHeight: 104,

    marginTop: 24,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    borderRadius: 18,

    backgroundColor: "#0D1C2A",

    borderWidth: 1,
    borderColor: "#193143",

    paddingHorizontal: 10,
  },

  feature: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,

    backgroundColor: "#102A3A",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 6,

    borderWidth: 1,
    borderColor: "#1C5368",
  },

  featureTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  featureText: {
    color: "#8FA1AF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },

  featureDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#233746",
  },

  helperText: {
    color: "#738695",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",

    marginTop: 18,
    paddingHorizontal: 12,
  },

  footer: {
    color: "#536877",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",

    marginTop: 16,
  },
});