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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
        {/* HEADER */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.title}>{t("profile.title")}</Text>
            <Text style={styles.subtitle}>{t("profile.subtitle")}</Text>
          </View>

          <View style={styles.headerIconButton}>
            <Ionicons name="settings-outline" size={23} color={COLORS.primary} />
          </View>
        </View>

        {/* FOOTBALL IDENTITY */}
        <View style={styles.identityCard}>
          <View style={styles.identityGlowOne} />
          <View style={styles.identityGlowTwo} />

          <View style={styles.identityContent}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={42} color={COLORS.primary} />
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="football" size={15} color="#07111F" />
              </View>
            </View>

            <View style={styles.identityText}>
              <Text style={styles.playerName} numberOfLines={1}>
                {fullName || t("profile.footballPlayer")}
              </Text>
              <Text style={styles.playerRole}>{profileRoleLabel()}</Text>

              {!!skillLevel && (
                <View style={styles.skillBadge}>
                  <Ionicons name="speedometer-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.skillBadgeText}>{skillLabel(skillLevel)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* PERSONAL INFORMATION */}
        <Text style={styles.groupTitle}>{t("profile.personalInformation")}</Text>
        <View style={styles.menuCard}>
          <View style={styles.formBlock}>
            <View style={styles.formLabelRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.rowTitle}>{t("profile.fullName")}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t("profile.namePlaceholder")}
              placeholderTextColor="#667786"
              value={fullName}
              onChangeText={setFullName}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.formBlock}>
            <View style={styles.formLabelRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.rowTitle}>{t("profile.phone")}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="+251 9..."
              placeholderTextColor="#667786"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="done"
              blurOnSubmit
            />
          </View>
        </View>

        {/* SKILL LEVEL */}
        <View style={styles.menuCardCompact}>
          <View style={styles.formLabelRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.rowTitle}>{t("profile.skillLevel")}</Text>
          </View>

          <View style={styles.skillContainer}>
            {skillLevels.map((level) => {
              const selected = skillLevel === level;
              return (
                <Pressable
                  key={level}
                  style={({ pressed }) => [
                    styles.skillButton,
                    selected && styles.skillButtonSelected,
                    pressed && styles.pressableMuted,
                  ]}
                  onPress={() => setSkillLevel(level)}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
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
        </View>

        {/* LANGUAGE */}
        <View style={styles.menuCardCompact}>
          <Pressable
            style={({ pressed }) => [
              styles.languageRow,
              pressed && styles.pressableMuted,
            ]}
            onPress={() => setLanguageMenuOpen((open) => !open)}
          >
            <View style={styles.menuRowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="language-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuRowText}>
                <Text style={styles.rowTitle}>{t("profile.language")}</Text>
                <Text style={styles.rowSubtitle}>
                  {languageOptions.find((option) => option.code === language)?.label ||
                    language.toUpperCase()}
                </Text>
              </View>
            </View>
            <Ionicons
              name={languageMenuOpen ? "chevron-up" : "chevron-down"}
              size={21}
              color="#7E93A3"
            />
          </Pressable>

          {languageMenuOpen && (
            <View style={styles.languageMenu}>
              {languageOptions.map((option) => {
                const selected = language === option.code;
                return (
                  <Pressable
                    key={option.code}
                    style={({ pressed }) => [
                      styles.languageOption,
                      selected && styles.languageOptionSelected,
                      pressed && styles.pressableMuted,
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
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            saving && styles.disabledButton,
            pressed && !saving && styles.saveButtonPressed,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#07111F" />
          ) : (
            <Text style={styles.saveButtonText}>{t("profile.saveProfile")}</Text>
          )}
        </Pressable>

        {/* ADMIN / ORGANIZER TOOLS - preserved */}
        {canManageGames && (
          <View style={styles.adminSection}>
            <View style={styles.adminHeader}>
              <View style={styles.rowIcon}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuRowText}>
                <Text style={styles.adminTitle}>{t("profile.adminTools")}</Text>
                <Text style={styles.adminSubtitle}>{t("profile.adminToolsSubtitle")}</Text>
              </View>
            </View>

            <AdminRow
              icon="add-circle-outline"
              title={t("profile.createGame")}
              subtitle={t("profile.createGameSubtitle")}
              onPress={() => router.push("/admin/create-game")}
            />
            <View style={styles.rowDivider} />
            <AdminRow
              icon="settings-outline"
              title={t("profile.manageGames")}
              subtitle={t("profile.manageGamesSubtitle")}
              onPress={() => router.push("/admin/manage-games")}
            />
            <View style={styles.rowDivider} />
            <AdminRow
              icon="card-outline"
              title={t("profile.paymentRequests")}
              subtitle={t("profile.paymentRequestsSubtitle")}
              onPress={() => router.push("/admin/payment-requests")}
            />
          </View>
        )}

        {/* SIGN OUT */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
          ]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={22} color="#FF5A62" />
          <Text style={styles.signOutText}>{t("profile.signOut")}</Text>
          <Ionicons name="chevron-forward" size={20} color="#708594" />
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

type AdminRowProps = {
  icon: "add-circle-outline" | "settings-outline" | "card-outline";
  title: string;
  subtitle: string;
  onPress: () => void;
};

function AdminRow({ icon, title, subtitle, onPress }: AdminRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.adminButton, pressed && styles.pressableMuted]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.menuRowText}>
        <Text style={styles.adminButtonTitle}>{title}</Text>
        <Text style={styles.adminButtonSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#708594" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07131D",
  },
  container: {
    flex: 1,
    backgroundColor: "#07131D",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  contentDesktop: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#07131D",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#8FA1AF",
    fontSize: 14,
    marginTop: 12,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  pageHeaderText: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#91A4B2",
    fontSize: 15,
    marginTop: 3,
  },
  headerIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#0D2737",
    borderWidth: 1,
    borderColor: "#123B50",
    alignItems: "center",
    justifyContent: "center",
  },
  identityCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: 170,
    marginTop: 22,
    borderRadius: 22,
    backgroundColor: "#0A2231",
    borderWidth: 1,
    borderColor: "#0D536B",
    justifyContent: "center",
  },
  identityGlowOne: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(26, 194, 242, 0.10)",
    right: -65,
    top: -85,
  },
  identityGlowTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.035)",
    left: -55,
    bottom: -70,
  },
  identityContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarWrap: {
    position: "relative",
    marginRight: 17,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#102D3E",
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: "#0A2231",
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.45,
  },
  playerRole: {
    color: "#A9BAC5",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },
  skillBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(25, 194, 242, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(25, 194, 242, 0.35)",
  },
  skillBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  groupTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginTop: 26,
    marginBottom: 11,
  },
  menuCard: {
    borderRadius: 18,
    backgroundColor: "#0C1F2B",
    borderWidth: 1,
    borderColor: "#173442",
    paddingHorizontal: 15,
  },
  menuCardCompact: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#0C1F2B",
    borderWidth: 1,
    borderColor: "#173442",
    padding: 15,
  },
  formBlock: {
    paddingVertical: 11,
  },
  formLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#102D3E",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  input: {
    height: 46,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#244252",
    borderRadius: 13,
    backgroundColor: "#081923",
    paddingHorizontal: 14,
    color: "#FFFFFF",
    fontSize: 15,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1D3948",
  },
  skillContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },
  skillButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#284453",
    backgroundColor: "#081923",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  skillButtonSelected: {
    backgroundColor: "#12384A",
    borderColor: COLORS.primary,
  },
  skillButtonText: {
    color: "#8FA1AF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  skillButtonTextSelected: {
    color: "#FFFFFF",
  },
  languageRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  menuRowText: {
    flex: 1,
    minWidth: 0,
  },
  rowSubtitle: {
    color: "#8FA1AF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  languageMenu: {
    marginTop: 10,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1D3948",
    gap: 7,
  },
  languageOption: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#081923",
    borderWidth: 1,
    borderColor: "#203B49",
  },
  languageOptionSelected: {
    backgroundColor: "#103245",
    borderColor: "#1A7895",
  },
  languageOptionTextWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  languageOptionText: {
    color: "#D7E0E6",
    fontSize: 14,
    fontWeight: "700",
  },
  languageOptionTextSelected: {
    color: "#FFFFFF",
  },
  languageOptionCode: {
    color: "#6F8593",
    fontSize: 10,
    fontWeight: "800",
  },
  languageOptionCodeSelected: {
    color: COLORS.primary,
  },
  saveButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  saveButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#07111F",
    fontSize: 15,
    fontWeight: "900",
  },
  adminSection: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#0C1F2B",
    borderWidth: 1,
    borderColor: "#173442",
    paddingHorizontal: 15,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 15,
  },
  adminTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  adminSubtitle: {
    color: "#8FA1AF",
    fontSize: 12,
    marginTop: 3,
  },
  adminButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
  },
  adminButtonTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  adminButtonSubtitle: {
    color: "#8FA1AF",
    fontSize: 12,
    marginTop: 3,
  },
  signOutButton: {
    minHeight: 62,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#0C1F2B",
    borderWidth: 1,
    borderColor: "#173442",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  signOutButtonPressed: {
    backgroundColor: "#142531",
  },
  signOutText: {
    flex: 1,
    color: "#FF5A62",
    fontSize: 15,
    fontWeight: "800",
  },
  pressableMuted: {
    opacity: 0.7,
  },
  bottomSpace: {
    height: 30,
  },
});