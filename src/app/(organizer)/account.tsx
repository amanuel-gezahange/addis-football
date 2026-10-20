import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

type Language = "en" | "am" | "om";

export default function OrganizerAccount() {
  const insets = useSafeAreaInsets();

  const {
    language,
    setLanguage,
    t,
  } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Error loading organizer account:",
          error
        );
        return;
      }

      setFullName(data?.full_name ?? "");
      setPhone(data?.phone ?? user.phone ?? "");
    } catch (error) {
      console.error(
        "Error loading organizer account:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveAccount() {
    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      Alert.alert(
        t("organizerAccount.accountSaved"),
        t("organizerAccount.accountUpdated")
      );
    } catch (error) {
      console.error(
        "Error saving organizer account:",
        error
      );

      Alert.alert(
        t("organizerAccount.couldNotSave"),
        t("organizerAccount.tryAgain")
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      setSigningOut(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/login");
    } catch (error) {
      console.error("Sign out error:", error);

      Alert.alert(
        t("organizerAccount.couldNotSignOut"),
        t("organizerAccount.tryAgain")
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              {t("organizerAccount.eyebrow")}
            </Text>

            <Text style={styles.title}>
              {t("organizerAccount.title")}
            </Text>

            <Text style={styles.subtitle}>
              {t("organizerAccount.subtitle")}
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="settings-outline"
              size={25}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={28}
              color="#07131D"
            />
          </View>

          <View style={styles.identityContent}>
            <Text
              style={styles.identityName}
              numberOfLines={1}
            >
              {fullName.trim() ||
                t("organizerAccount.organizer")}
            </Text>

            <View style={styles.roleRow}>
              <View style={styles.roleDot} />

              <Text style={styles.roleText}>
                {t("organizerAccount.organizer")}
              </Text>
            </View>
          </View>

          <Ionicons
            name="shield-checkmark"
            size={23}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.sectionLabel}>
          {t("organizerAccount.personalInformation")}
        </Text>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {t("organizerAccount.fullName")}
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={19}
                color="#718894"
              />

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={t(
                  "organizerAccount.namePlaceholder"
                )}
                placeholderTextColor="#5F7480"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {t("organizerAccount.phone")}
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="call-outline"
                size={19}
                color="#718894"
              />

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={t(
                  "organizerAccount.phonePlaceholder"
                )}
                placeholderTextColor="#5F7480"
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>
          {t("organizerAccount.language")}
        </Text>

        <View style={styles.card}>
          <LanguageOption
            label={t("languages.english")}
            code="EN"
            selected={language === "en"}
            onPress={() =>
              setLanguage("en" as Language)
            }
          />

          <View style={styles.optionDivider} />

          <LanguageOption
            label={t("languages.amharic")}
            code="AM"
            selected={language === "am"}
            onPress={() =>
              setLanguage("am" as Language)
            }
          />

          <View style={styles.optionDivider} />

          <LanguageOption
            label={t("languages.oromo")}
            code="OM"
            selected={language === "om"}
            onPress={() =>
              setLanguage("om" as Language)
            }
          />
        </View>

        <Pressable
          disabled={saving}
          onPress={saveAccount}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
            saving && styles.buttonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#07131D"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={21}
                color="#07131D"
              />

              <Text style={styles.saveButtonText}>
                {t("organizerAccount.saveAccount")}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          disabled={signingOut}
          onPress={signOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.buttonPressed,
            signingOut && styles.buttonDisabled,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator
              size="small"
              color="#FF6B6B"
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#FF6B6B"
              />

              <Text style={styles.signOutText}>
                {t("organizerAccount.signOut")}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footer}>
          {t("organizerAccount.footer")}
        </Text>
      </ScrollView>
    </View>
  );
}

function LanguageOption({
  label,
  code,
  selected,
  onPress,
}: {
  label: string;
  code: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.languageRow,
        pressed && styles.languagePressed,
      ]}
    >
      <View style={styles.languageCode}>
        <Text style={styles.languageCodeText}>
          {code}
        </Text>
      </View>

      <Text style={styles.languageLabel}>
        {label}
      </Text>

      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
        ]}
      >
        {selected && (
          <View style={styles.radioInner} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07131D",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#07131D",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 5,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  subtitle: {
    color: "#8EA2AF",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0E2632",
    borderWidth: 1,
    borderColor: "#173B49",
    alignItems: "center",
    justifyContent: "center",
  },

  identityCard: {
    minHeight: 88,
    backgroundColor: "#0D202B",
    borderWidth: 1,
    borderColor: "#183844",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  identityContent: {
    flex: 1,
    minWidth: 0,
  },

  identityName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#39D98A",
    marginRight: 7,
  },

  roleText: {
    color: "#91A6B2",
    fontSize: 13,
    fontWeight: "600",
  },

  sectionLabel: {
    color: "#708894",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 11,
  },

  card: {
    backgroundColor: "#0D202B",
    borderWidth: 1,
    borderColor: "#183844",
    borderRadius: 19,
    paddingHorizontal: 15,
    marginBottom: 27,
  },

  field: {
    paddingVertical: 15,
  },

  fieldLabel: {
    color: "#91A4AE",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#091923",
    borderWidth: 1,
    borderColor: "#173744",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 10,
  },

  fieldDivider: {
    height: 1,
    backgroundColor: "#183844",
  },

  languageRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
  },

  languagePressed: {
    opacity: 0.75,
  },

  languageCode: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: "#102D38",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  languageCodeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },

  languageLabel: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  optionDivider: {
    height: 1,
    backgroundColor: "#183844",
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#536B77",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },

  saveButton: {
    minHeight: 55,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },

  saveButtonText: {
    color: "#07131D",
    fontSize: 15,
    fontWeight: "900",
  },

  signOutButton: {
    minHeight: 53,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#5A2B31",
    backgroundColor: "#1C171D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  signOutText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  footer: {
    color: "#536B77",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
  },
});