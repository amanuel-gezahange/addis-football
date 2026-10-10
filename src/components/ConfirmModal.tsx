import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS } from "../constants/colors";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;

  confirmText?: string;
  cancelText?: string;

  destructive?: boolean;
  loading?: boolean;

  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmColor = destructive
    ? "#FF747A"
    : COLORS.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!loading) {
          onCancel();
        }
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!loading) {
              onCancel();
            }
          }}
        />

        <View style={styles.modal}>
          <View
            style={[
              styles.iconContainer,
              destructive
                ? styles.destructiveIconContainer
                : styles.normalIconContainer,
            ]}
          >
            <Ionicons
              name={
                destructive
                  ? "warning-outline"
                  : "help-circle-outline"
              }
              size={28}
              color={confirmColor}
            />
          </View>

          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.message}>
            {message}
          </Text>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                destructive
                  ? styles.destructiveButton
                  : styles.confirmButton,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Ionicons
                name={
                  destructive
                    ? "trash-outline"
                    : "checkmark"
                }
                size={18}
                color={confirmColor}
              />

              <Text
                style={[
                  styles.confirmButtonText,
                  { color: confirmColor },
                ]}
              >
                {loading
                  ? "Please wait..."
                  : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  normalIconContainer: {
    backgroundColor: COLORS.surfaceAlt,
  },

  destructiveIconContainer: {
    backgroundColor: "#351E20",
  },

  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  message: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
  },

  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },

  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  cancelButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cancelButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },

  confirmButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  destructiveButton: {
    backgroundColor: "#351E20",
    borderWidth: 1,
    borderColor: "#7A3437",
  },

  confirmButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    opacity: 0.55,
  },
});