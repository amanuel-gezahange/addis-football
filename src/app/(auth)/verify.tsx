import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (!phone) {
      Alert.alert(
        "Missing phone number",
        "Please go back and enter your phone number again."
      );
      return;
    }

    if (otp.length !== 6) {
      Alert.alert(
        "Invalid code",
        "Please enter the 6-digit verification code."
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) {
        console.log("OTP verification error:", error);

        Alert.alert(
          "Invalid code",
          error.message
        );

        return;
      }

      if (!data.session) {
        Alert.alert(
          "Login failed",
          "We couldn't create your login session. Please try again."
        );
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      console.log("Verification error:", error);

      Alert.alert(
        "Something went wrong",
        "We couldn't verify the code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!phone || resending) {
      return;
    }

    try {
      setResending(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        console.log("Resend error:", error);

        Alert.alert(
          "Could not resend code",
          error.message
        );

        return;
      }

      setOtp("");

      Alert.alert(
        "Code sent",
        "A new verification code has been sent."
      );
    } catch (error) {
      console.log("Resend error:", error);

      Alert.alert(
        "Something went wrong",
        "We couldn't resend the code. Please try again."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.text}
          />
        </Pressable>

        <Text style={styles.title}>
          Verify your number
        </Text>

        <Text style={styles.subtitle}>
          Enter the 6-digit code we sent to{"\n"}
          {phone || "your phone"}.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={otp}
          onChangeText={(text) => {
            const numbersOnly = text.replace(/[^0-9]/g, "");
            setOtp(numbersOnly);
          }}
          placeholder="000000"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          editable={!loading}
        />

        <Pressable
          style={({ pressed }) => [
            styles.verifyButton,
            pressed &&
              otp.length === 6 &&
              !loading &&
              styles.verifyButtonPressed,
            (otp.length !== 6 || loading) &&
              styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={otp.length !== 6 || loading}
        >
          <Text style={styles.verifyText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.resendButton,
            pressed &&
              !resending &&
              !loading &&
              styles.pressed,
          ]}
          onPress={handleResend}
          disabled={resending || loading}
        >
          <Text style={styles.resendText}>
            {resending
              ? "Sending..."
              : "Didn't receive a code? Resend"}
          </Text>
        </Pressable>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 10,
    marginBottom: 32,
  },

  codeInput: {
    height: 70,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 12,
    paddingHorizontal: 20,
  },

  verifyButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  verifyButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  verifyButtonDisabled: {
    opacity: 0.45,
  },

  verifyText: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "800",
  },

  resendButton: {
    alignItems: "center",
    paddingVertical: 20,
  },

  resendText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.75,
  },
});