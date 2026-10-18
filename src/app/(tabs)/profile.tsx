import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import { useEffect, useState } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { COLORS } from "../../constants/colors";

import { languageOptions, Language } from "../../i18n";

import { useLanguage } from "../../i18n/LanguageContext";

import { supabase } from "../../lib/supabase";

const skillLevels = ["Beginner", "Intermediate", "Advanced"];

export default function ProfileScreen() {
  const { width } = useWindowDimensions();

  const isDesktopWeb = Platform.OS === "web" && width >= 900;

  const [fullName, setFullName] = useState("");

  const [phone, setPhone] = useState("");

  const [skillLevel, setSkillLevel] = useState("");

  const [role, setRole] = useState("player");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    loadProfile();
  }, []);

  async function changeLanguage(nextLanguage: Language) {
    await setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  }

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },

      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log(
        "Profile user error:",

        userError?.message || "No user",
      );

      setLoading(false);

      return;
    }

    setPhone(user.phone || "");

    const { data, error } = await supabase

      .from("profiles")

      .select("full_name, phone, skill_level, role")

      .eq("id", user.id)

      .maybeSingle();

    if (error) {
      console.log("Profile error:", error.message);

      setLoading(false);

      return;
    }

    if (data) {
      setFullName(data.full_name || "");

      setPhone(data.phone || user.phone || "");

      setSkillLevel(data.skill_level || "");

      setRole(data.role || "player");
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert(
        t("profile.nameRequired"),

        t("profile.nameRequiredMessage"),
      );

      return;
    }

    if (!skillLevel) {
      Alert.alert(
        t("profile.skillRequired"),

        t("profile.skillRequiredMessage"),
      );

      return;
    }

    setSaving(true);

    const {
      data: { user },

      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert(
        t("profile.error"),

        t("profile.notLoggedIn"),
      );

      setSaving(false);

      return;
    }

    const { error } = await supabase

      .from("profiles")

      .update({
        full_name: fullName.trim(),

        phone: phone.trim() || null,

        skill_level: skillLevel || null,
      })

      .eq("id", user.id);

    if (error) {
      console.log("Profile save error:", error.message);

      Alert.alert(
        t("profile.couldNotSave"),

        error.message,
      );

      setSaving(false);

      return;
    }

    setSaving(false);

    Alert.alert(
      t("profile.saved"),

      t("profile.profileUpdated"),
    );
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert(
        t("profile.signOutFailed"),

        error.message,
      );

      return;
    }

    router.replace("/login");
  }

  const canManageGames = role === "admin" || role === "organizer";

  function skillLabel(level: string) {
    if (level === "Beginner") {
      return t("profile.beginner");
    }

    if (level === "Intermediate") {
      return t("profile.intermediate");
    }

    if (level === "Advanced") {
      return t("profile.advanced");
    }

    return level;
  }

  function profileRoleLabel() {
    if (role === "admin") {
      return t("profile.admin");
    }

    if (role === "organizer") {
      return t("profile.organizer");
    }

    return t("profile.footballPlayer");
  }

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}

        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"

            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}

      edges={["top"]}
    >
      <ScrollView
        style={styles.container}

        contentContainerStyle={[
          styles.content,

          isDesktopWeb && styles.contentDesktop,
        ]}

        showsVerticalScrollIndicator={false}

        keyboardShouldPersistTaps="handled"

        keyboardDismissMode="none"
      >
        <Text style={styles.title}>{t("profile.title")}</Text>

        <Text style={styles.subtitle}>{t("profile.subtitle")}</Text>

        {/* AVATAR */}

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"

              size={38}

              color={COLORS.primary}
            />
          </View>

          <Text style={styles.playerName}>
            {fullName || t("profile.footballPlayer")}
          </Text>

          <Text style={styles.phoneText}>
            {phone || t("profile.phoneNumber")}
          </Text>

          {canManageGames && (
            <View style={styles.roleBadge}>
              <Ionicons
                name="shield-checkmark"

                size={15}

                color={COLORS.primary}
              />

              <Text style={styles.roleBadgeText}>
                {role === "admin" ? t("profile.admin") : t("profile.organizer")}
              </Text>
            </View>
          )}
        </View>
        {/* LANGUAGE */}
        <View style={styles.sectionCard}>
          <Pressable
            style={styles.languageRow}
            onPress={() => setLanguageMenuOpen((open) => !open)}
          >
            <View style={styles.languageRowLeft}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="language-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.languageRowText}>
                <Text style={styles.sectionTitle}>{t("profile.language")}</Text>

                <Text style={styles.currentLanguage}>
                  {languageOptions.find((option) => option.code === language)
                    ?.label || language.toUpperCase()}
                </Text>
              </View>
            </View>

            <Ionicons
              name={languageMenuOpen ? "chevron-up" : "chevron-down"}
              size={21}
              color="#7D8994"
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
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        <View style={styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="football-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.sectionTitle}>{profileRoleLabel()}</Text>
          </View>
          <Text style={styles.cardLabel}>{t("profile.fullName")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("profile.namePlaceholder")}
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
            returnKeyType="done"
            blurOnSubmit
          />
          <Text style={styles.cardLabel}>{t("profile.phone")}</Text>

          <TextInput
            style={styles.input}
            placeholder="+251 9..."
            placeholderTextColor={COLORS.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            blurOnSubmit
          />
          <Text style={styles.cardLabel}>{t("profile.skillLevel")}</Text>
          <View style={styles.skillContainer}>
            {skillLevels.map((level) => {
              const selected = skillLevel === level;
              return (
                <Pressable
                  key={level}
                  style={[
                    styles.skillButton,
                    selected && styles.skillButtonSelected,
                  ]}
                  onPress={() => setSkillLevel(level)}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[
                      styles.skillButtonText,
                      selected && styles.skillButtonTextSelected,
                    ]}
                  >
                    {skillLabel(level)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.saveButtonText}>
                {t("profile.saveProfile")}
              </Text>
            )}
          </Pressable>
        </View>

        {/* ADMIN TOOLS */}

        {canManageGames && (
          <View style={styles.adminSection}>
            <View style={styles.adminHeader}>
              <View style={styles.adminIcon}>
                <Ionicons
                  name="shield-checkmark"

                  size={22}

                  color={COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.adminTitle}>{t("profile.adminTools")}</Text>

                <Text style={styles.adminSubtitle}>
                  {t("profile.adminToolsSubtitle")}
                </Text>
              </View>
            </View>

            {/* CREATE GAME */}

            <Pressable
              style={styles.adminButton}

              onPress={() => router.push("/admin/create-game")}
            >
              <View style={styles.adminButtonIcon}>
                <Ionicons
                  name="add-circle-outline"

                  size={24}

                  color={COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.adminButtonTitle}>
                  {t("profile.createGame")}
                </Text>

                <Text style={styles.adminButtonSubtitle}>
                  {t("profile.createGameSubtitle")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"

                size={22}

                color={COLORS.textMuted}
              />
            </Pressable>

            {/* MANAGE GAMES */}

            <Pressable
              style={styles.adminButton}

              onPress={() => router.push("/admin/manage-games")}
            >
              <View style={styles.adminButtonIcon}>
                <Ionicons
                  name="settings-outline"

                  size={23}

                  color={COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.adminButtonTitle}>
                  {t("profile.manageGames")}
                </Text>

                <Text style={styles.adminButtonSubtitle}>
                  {t("profile.manageGamesSubtitle")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"

                size={22}

                color={COLORS.textMuted}
              />
            </Pressable>

            {/* PAYMENT REQUESTS */}

            <Pressable
              style={styles.adminButton}

              onPress={() => router.push("/admin/payment-requests")}
            >
              <View style={styles.adminButtonIcon}>
                <Ionicons
                  name="card-outline"

                  size={23}

                  color={COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.adminButtonTitle}>
                  {t("profile.paymentRequests")}
                </Text>

                <Text style={styles.adminButtonSubtitle}>
                  {t("profile.paymentRequestsSubtitle")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"

                size={22}

                color={COLORS.textMuted}
              />
            </Pressable>
          </View>
        )}

        {/* SIGN OUT */}

        <Pressable
          style={styles.signOutButton}

          onPress={handleSignOut}
        >
          <Ionicons
            name="log-out-outline"

            size={21}

            color="#C13515"
          />

          <Text style={styles.signOutText}>{t("profile.signOut")}</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
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
    backgroundColor: "#07111F",
  },

  content: {
    paddingHorizontal: 20,

    paddingTop: 14,
  },

  contentDesktop: {
    width: "100%",

    maxWidth: 900,

    alignSelf: "center",

    paddingHorizontal: 28,

    paddingTop: 24,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#07111F",

    alignItems: "center",

    justifyContent: "center",
  },

  loadingText: {
    color: "#8FA1AF",
    fontSize: 14,
    marginTop: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    color: "#8FA1AF",
    fontSize: 15,
    marginTop: 3,
  },

  avatarSection: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 4,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#102231",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1C3A4E",
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 11,
  },

  phoneText: {
    color: "#8FA1AF",
    fontSize: 14,
    marginTop: 3,
  },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#102A3A",
    borderWidth: 1,
    borderColor: "#1C5368",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    marginTop: 9,
  },

  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 17,
  },

  sectionCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE5EA",
  },
  detailsCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE5EA",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  languageRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  languageRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  languageRowText: {
    flex: 1,
  },

  currentLanguage: {
    color: "#7D8994",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },

  languageMenu: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF0",
    gap: 6,
  },

  languageOption: {
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F9FA",
    borderWidth: 1,
    borderColor: "#E4E9ED",
  },

  languageOptionSelected: {
    backgroundColor: "#EAF9FE",
    borderColor: "#B9EAF8",
  },

  languageOptionTextWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  languageOptionText: {
    color: "#222222",
    fontSize: 14,
    fontWeight: "700",
  },

  languageOptionTextSelected: {
    color: "#07111F",
  },

  languageOptionCode: {
    color: "#9A9A9A",
    fontSize: 10,
    fontWeight: "800",
  },

  languageOptionCodeSelected: {
    color: "#568091",
  },
  sectionTitle: { color: "#17202A", fontSize: 16, fontWeight: "800" },
  languageCompactContainer: { flexDirection: "row", gap: 7 },
  languageCompactButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    backgroundColor: "#F7F9FA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  languageCompactButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageCompactText: {
    color: "#222222",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  languageCompactTextSelected: { color: "#07111F" },
  languageCompactCode: {
    color: "#9A9A9A",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  languageCompactCodeSelected: { color: "#173040" },
  cardLabel: {
    color: "#222222",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 13,
  },
  cardHelp: { color: "#7D8994", fontSize: 11, marginTop: 6 },

  languageContainer: {
    gap: 7,
    marginBottom: 2,
  },

  languageButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  languageButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  languageTextContainer: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,
  },

  languageButtonText: {
    color: "#222222",
    fontSize: 15,
    fontWeight: "600",
  },

  languageButtonTextSelected: {
    color: "#07111F",
  },

  languageCode: {
    color: "#9A9A9A",
    fontSize: 11,
    fontWeight: "700",
  },

  languageCodeSelected: {
    color: "#07111F",
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    color: "#222222",
    fontSize: 15,
  },

  phoneBox: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  phoneBoxText: {
    flex: 1,
    color: "#717171",
    fontSize: 15,
  },

  phoneHelp: {
    color: "#8FA1AF",
    fontSize: 12,
    marginTop: 6,
  },

  skillContainer: {
    flexDirection: "row",

    gap: 8,
  },

  skillButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    gap: 5,

    paddingHorizontal: 6,
  },

  skillButtonSelected: {
    backgroundColor: "#102231",
    borderColor: COLORS.primary,
  },

  skillButtonText: {
    color: "#717171",
    fontSize: 13,
    fontWeight: "600",
  },

  skillButtonTextSelected: {
    color: "#FFFFFF",
  },

  saveButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#07111F",
    fontSize: 15,
    fontWeight: "700",
  },

  adminSection: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },

  adminHeader: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,

    marginBottom: 5,
  },

  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2FBFE",

    alignItems: "center",

    justifyContent: "center",
  },

  adminTitle: {
    color: "#222222",
    fontSize: 17,
    fontWeight: "700",
  },

  adminSubtitle: {
    color: "#717171",
    fontSize: 13,
    marginTop: 2,
  },

  adminButton: {
    minHeight: 62,
    borderRadius: 13,
    backgroundColor: "#F7F7F7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 11,
  },

  adminButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",
  },

  adminButtonTitle: {
    color: "#222222",
    fontSize: 14,
    fontWeight: "700",
  },

  adminButtonSubtitle: {
    color: "#717171",
    fontSize: 12,
    marginTop: 2,
  },

  signOutButton: {
    alignSelf: "center",
    minHeight: 42,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 20,
  },

  signOutText: {
    color: "#C13515",
    fontSize: 14,
    fontWeight: "600",
  },
});