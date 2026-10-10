import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReviewLogin, setShowReviewLogin] = useState(false);
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewPassword, setReviewPassword] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  async function handleContinue() {
    if (loading) return;

    let cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.slice(1);
    }

    if (!/^9\d{8}$/.test(cleanPhone)) {
      Alert.alert(
        "Invalid phone number",
        "Enter a valid Ethiopian mobile number."
      );
      return;
    }

    const fullPhone = `+251${cleanPhone}`;

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        console.log("OTP error:", error);

        Alert.alert("Could not send code", error.message);
        return;
      }

      router.push({
        pathname: "/verify",
        params: {
          phone: fullPhone,
        },
      });
    } catch (error) {
      console.log("Login error:", error);

      Alert.alert(
        "Something went wrong",
        "We couldn't send the verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewLogin() {
    if (reviewLoading) return;

    const email = reviewEmail.trim();

    if (!email || !reviewPassword) {
      Alert.alert(
        "Missing information",
        "Enter the review email and password."
      );
      return;
    }

    try {
      setReviewLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: reviewPassword,
      });

      if (error) {
        console.log("Review login error:", error);

        Alert.alert(
          "Login failed",
          "The review account email or password is incorrect."
        );

        return;
      }

      router.replace("/");
    } catch (error) {
      console.log("Review login error:", error);

      Alert.alert(
        "Something went wrong",
        "Unable to sign in. Please try again."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logo}>
            <Ionicons
              name="football"
              size={34}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.title}>Welcome</Text>

          <Text style={styles.subtitle}>
            Enter your phone number to continue.
          </Text>

          <Text style={styles.label}>Phone number</Text>

          <View style={styles.phoneContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇪🇹</Text>

              <Text style={styles.countryCodeText}>+251</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="9 12 345 678"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && !loading && styles.continueButtonPressed,
              loading && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={loading}
          >
            <Text style={styles.continueText}>
              {loading ? "Sending..." : "Continue"}
            </Text>
          </Pressable>

          <Text style={styles.terms}>
            We'll send you a verification code by SMS.
          </Text>

          <Pressable
            style={styles.reviewToggle}
            onPress={() => setShowReviewLogin((current) => !current)}
          >
            <Text style={styles.reviewToggleText}>
              {showReviewLogin
                ? "Hide App Review Login"
                : "App Review Login"}
            </Text>

            <Ionicons
              name={showReviewLogin ? "chevron-up" : "chevron-down"}
              size={16}
              color={COLORS.textMuted}
            />
          </Pressable>

          {showReviewLogin && (
            <View style={styles.reviewContainer}>
              <Text style={styles.reviewTitle}>
                App Review
              </Text>

              <Text style={styles.reviewDescription}>
                Sign in with the review account.
              </Text>

              <TextInput
                style={styles.reviewInput}
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={reviewEmail}
                onChangeText={setReviewEmail}
                editable={!reviewLoading}
              />

              <TextInput
                style={styles.reviewInput}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={reviewPassword}
                onChangeText={setReviewPassword}
                editable={!reviewLoading}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.reviewButton,
                  pressed && styles.reviewButtonPressed,
                  reviewLoading && styles.continueButtonDisabled,
                ]}
                onPress={handleReviewLogin}
                disabled={reviewLoading}
              >
                <Text style={styles.reviewButtonText}>
                  {reviewLoading ? "Signing in..." : "Sign In"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
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

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 8,
    marginBottom: 36,
  },

  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },

  phoneContainer: {
    height: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
  },

  countryCode: {
    height: "100%",
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  flag: {
    fontSize: 22,
  },

  countryCodeText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 17,
  },

  continueButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  continueButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  continueButtonDisabled: {
    opacity: 0.55,
  },

  continueText: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "800",
  },

  terms: {
    color: COLORS.textMuted,
    textAlign: "center",
    fontSize: 13,
    marginTop: 18,
  },

  reviewToggle: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  reviewToggleText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  reviewContainer: {
    marginTop: 18,
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },

  reviewTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  reviewDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },

  reviewInput: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  reviewButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  reviewButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  reviewButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "800",
  },
});