import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../constants/colors";
import { languageOptions, Language } from "../i18n";
import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../lib/supabase";

const PRIVACY_POLICY_URL =
  "https://amanuel-gezahange.github.io/addis-football/";

const DELETE_ACCOUNT_URL =
  "https://amanuel-gezahange.github.io/addis-football/delete-account.html";

const SUPPORT_EMAIL = "addisfootballapp@gmail.com";

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();

  const [languageOpen, setLanguageOpen] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadRole() {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;

        if (!userId) {
          if (active) {
            setIsOrganizer(false);
          }

          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.log("Settings role error:", error);
          return;
        }

        setIsOrganizer(data?.role === "organizer");
      }

      loadRole();

      return () => {
        active = false;
      };
    }, []),
  );

  async function changeLanguage(nextLanguage: Language) {
    await setLanguage(nextLanguage);
    setLanguageOpen(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert(t("settings.signOutFailed"), error.message);
      return;
    }

    router.replace("/login");
  }

  async function openExternalUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          t("settings.unableToOpenLink"),
          t("settings.unableToOpenLinkMessage"),
        );

        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log("Open URL error:", error);

      Alert.alert(
        t("settings.unableToOpenLink"),
        t("settings.pleaseTryAgain"),
      );
    }
  }

  async function openSupportEmail() {
    const subject = encodeURIComponent(
      t("settings.supportEmailSubject"),
    );

    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          t("settings.contactSupport"),
          `${t("settings.emailUsAt")} ${SUPPORT_EMAIL}`,
        );

        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log("Support email error:", error);

      Alert.alert(
        t("settings.contactSupport"),
        `${t("settings.emailUsAt")} ${SUPPORT_EMAIL}`,
      );
    }
  }

  function currentLanguageLabel() {
    return (
      languageOptions.find(
        (option) => option.code === language,
      )?.label || language.toUpperCase()
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/profile");
            }
          }}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          {t("settings.title")}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERAL */}
        <Text style={styles.sectionTitle}>
          {t("settings.general")}
        </Text>

        <View style={styles.card}>
          {/* LANGUAGE */}
          <Pressable
            style={({ pressed }) => [
              styles.row,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              setLanguageOpen((open) => !open)
            }
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons
                  name="language-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {t("settings.language")}
                </Text>

                <Text style={styles.rowSubtitle}>
                  {currentLanguageLabel()}
                </Text>
              </View>
            </View>

            <Ionicons
              name={
                languageOpen
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={20}
              color="#708594"
            />
          </Pressable>

          {languageOpen && (
            <View style={styles.languageContainer}>
              {languageOptions.map((option) => {
                const selected =
                  language === option.code;

                return (
                  <Pressable
                    key={option.code}
                    style={({ pressed }) => [
                      styles.languageOption,
                      selected &&
                        styles.languageOptionSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      changeLanguage(option.code)
                    }
                  >
                    <View>
                      <Text
                        style={[
                          styles.languageName,
                          selected &&
                            styles.languageNameSelected,
                        ]}
                      >
                        {option.label}
                      </Text>

                      <Text
                        style={[
                          styles.languageCode,
                          selected &&
                            styles.languageCodeSelected,
                        ]}
                      >
                        {option.code.toUpperCase()}
                      </Text>
                    </View>

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.divider} />

          {/* NOTIFICATIONS */}
          <SettingsRow
            icon="notifications-outline"
            title={t("settings.notifications")}
            subtitle={t(
              "settings.notificationsSubtitle",
            )}
            onPress={() =>
              router.push("/notifications")
            }
          />
        </View>

        {/* ORGANIZE */}
        <Text style={styles.sectionTitle}>
          Organize
        </Text>

        <View style={styles.card}>
          <SettingsRow
            icon={
              isOrganizer
                ? "grid-outline"
                : "football-outline"
            }
            title={
              isOrganizer
                ? "Organizer Dashboard"
                : "Become an Organizer"
            }
            subtitle={
              isOrganizer
                ? "Manage your games and players"
                : "Host games and reach more players"
            }
            onPress={() => {
              if (isOrganizer) {
                router.push("/(organizer)");
              } else {
                router.push("/become-organizer");
              }
            }}
          />
        </View>

        {/* SUPPORT */}
        <Text style={styles.sectionTitle}>
          {t("settings.support")}
        </Text>

        <View style={styles.card}>
          {/* HELP */}
          <SettingsRow
            icon="help-circle-outline"
            title={t("settings.helpSupport")}
            subtitle={t(
              "settings.helpSupportSubtitle",
            )}
            onPress={openSupportEmail}
          />

          <View style={styles.divider} />

          {/* PRIVACY POLICY */}
          <SettingsRow
            icon="document-text-outline"
            title={t("settings.privacyPolicy")}
            onPress={() =>
              openExternalUrl(PRIVACY_POLICY_URL)
            }
          />
        </View>

        {/* ACCOUNT */}
        <Text style={styles.sectionTitle}>
          {t("settings.account")}
        </Text>

        <View style={styles.card}>
          {/* DELETE ACCOUNT */}
          <SettingsRow
            icon="trash-outline"
            title={t("settings.deleteAccount")}
            danger
            onPress={() =>
              openExternalUrl(DELETE_ACCOUNT_URL)
            }
          />

          <View style={styles.divider} />

          {/* SIGN OUT */}
          <SettingsRow
            icon="log-out-outline"
            title={t("settings.signOut")}
            danger
            onPress={handleSignOut}
          />
        </View>

        <Text style={styles.version}>
          {t("settings.footer")}
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsRowProps = {
  icon:
    | "notifications-outline"
    | "help-circle-outline"
    | "document-text-outline"
    | "trash-outline"
    | "log-out-outline"
    | "football-outline"
    | "grid-outline";
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
};

function SettingsRow({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
}: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconBox,
            danger && styles.dangerIconBox,
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={
              danger
                ? "#FF5A62"
                : COLORS.primary
            }
          />
        </View>

        <View style={styles.rowText}>
          <Text
            style={[
              styles.rowTitle,
              danger && styles.dangerText,
            ]}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text style={styles.rowSubtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#708594"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07131D",
  },

  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#183844",
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  sectionTitle: {
    color: "#8FA1AF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
    marginBottom: 9,
    marginTop: 8,
  },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0C1F2B",
    borderWidth: 1,
    borderColor: "#173442",
    paddingHorizontal: 15,
    marginBottom: 18,
  },

  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rowText: {
    flex: 1,
    minWidth: 0,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#102D3E",
    alignItems: "center",
    justifyContent: "center",
  },

  rowTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  rowSubtitle: {
    color: "#8FA1AF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1D3948",
    marginLeft: 50,
  },

  languageContainer: {
    paddingBottom: 13,
    gap: 7,
  },

  languageOption: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "#081923",
    borderWidth: 1,
    borderColor: "#203B49",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  languageOptionSelected: {
    backgroundColor: "#103245",
    borderColor: "#1A7895",
  },

  languageName: {
    color: "#D7E0E6",
    fontSize: 14,
    fontWeight: "700",
  },

  languageNameSelected: {
    color: "#FFFFFF",
  },

  languageCode: {
    color: "#6F8593",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },

  languageCodeSelected: {
    color: COLORS.primary,
  },

  dangerIconBox: {
    backgroundColor:
      "rgba(255, 90, 98, 0.09)",
  },

  dangerText: {
    color: "#FF5A62",
  },

  version: {
    color: "#526B79",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },

  pressed: {
    opacity: 0.7,
  },

  bottomSpace: {
    height: 40,
  },
});