import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

export default function LoginScreen() {
  const { width } = useWindowDimensions();

  const isDesktopWeb =
    Platform.OS === "web" && width >= 900;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReviewLogin, setShowReviewLogin] = useState(false);
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewPassword, setReviewPassword] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function handleContinue() {
    if (loading) return;

    let cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.startsWith("251")) {
      cleanPhone = cleanPhone.slice(3);
    }

    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.slice(1);
    }

    if (!/^9\d{8}$/.test(cleanPhone)) {
      showMessage(
        "Invalid phone number",
        "Enter a valid Ethiopian mobile number.",
      );
      return;
    }

    const fullPhone = `+251${cleanPhone}`;

    try {
      Keyboard.dismiss();
      setLoading(true);

      console.log("Sending OTP to:", fullPhone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        console.log("OTP error:", error);

        showMessage(
          "Could not send code",
          error.message,
        );

        return;
      }

      console.log("OTP request successful");
      console.log("Opening verify screen");

      router.push({
        pathname: "/verify",
        params: {
          phone: fullPhone,
        },
      });
    } catch (error: any) {
      console.log("Login error:", error);

      showMessage(
        "Something went wrong",
        error?.message ||
          "We couldn't send the verification code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewLogin() {
    if (reviewLoading) return;

    const email = reviewEmail.trim();

    if (!email || !reviewPassword) {
      showMessage(
        "Missing information",
        "Enter the review email and password.",
      );
      return;
    }

    try {
      Keyboard.dismiss();
      setReviewLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password: reviewPassword,
        });

      if (error) {
        console.log("Review login error:", error);

        showMessage(
          "Login failed",
          "The review account email or password is incorrect.",
        );

        return;
      }

      router.replace("/");
    } catch (error: any) {
      console.log("Review login error:", error);

      showMessage(
        "Something went wrong",
        error?.message ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View
            style={[
              styles.content,
              isDesktopWeb && styles.contentDesktop,
            ]}
          >
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

                <Text style={styles.countryCodeText}>
                  +251
                </Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="9 12 345 678"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                pressed &&
                  !loading &&
                  styles.continueButtonPressed,
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
              onPress={() => {
                Keyboard.dismiss();
                setShowReviewLogin(
                  (current) => !current,
                );
              }}
            >
              <Text style={styles.reviewToggleText}>
                {showReviewLogin
                  ? "Hide App Review Login"
                  : "App Review Login"}
              </Text>

              <Ionicons
                name={
                  showReviewLogin
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={18}
                color={COLORS.textMuted}
              />
            </Pressable>

            {showReviewLogin && (
              <View style={styles.reviewContainer}>
                <Text style={styles.reviewTitle}>
                  App Review Login
                </Text>

                <Text style={styles.reviewSubtitle}>
                  Reviewer access only
                </Text>

                <Text style={styles.label}>Email</Text>

                <TextInput
                  style={styles.reviewInput}
                  value={reviewEmail}
                  onChangeText={setReviewEmail}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!reviewLoading}
                  returnKeyType="next"
                />

                <Text style={styles.label}>
                  Password
                </Text>

                <TextInput
                  style={styles.reviewInput}
                  value={reviewPassword}
                  onChangeText={setReviewPassword}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!reviewLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleReviewLogin}
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.reviewButton,
                    pressed &&
                      !reviewLoading &&
                      styles.reviewButtonPressed,
                    reviewLoading &&
                      styles.reviewButtonDisabled,
                  ]}
                  onPress={handleReviewLogin}
                  disabled={reviewLoading}
                >
                  <Text style={styles.reviewButtonText}>
                    {reviewLoading
                      ? "Signing in..."
                      : "Sign In"}
                  </Text>
                </Pressable>
              </View>
            )}
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
    marginBottom: 32,
  },

  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },

  phoneContainer: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },

  countryCode: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  flag: {
    fontSize: 20,
    marginRight: 8,
  },

  countryCodeText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 18,
    color: COLORS.text,
    fontSize: 18,
  },

  continueButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  continueButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  continueButtonDisabled: {
    opacity: 0.6,
  },

  continueText: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "800",
  },

  terms: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 18,
  },

  reviewToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 18,
    marginTop: 4,
  },

  reviewToggleText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },

  reviewContainer: {
    marginTop: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  reviewTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  reviewSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },

  reviewInput: {
    height: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },

  reviewButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  reviewButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  reviewButtonDisabled: {
    opacity: 0.6,
  },

  reviewButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "800",
  },
});