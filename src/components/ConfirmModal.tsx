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
  const confirmColor = destructive ? "#C13515" : "#087EA4";

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
              size={27}
              color={confirmColor}
            />
          </View>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
                loading && styles.disabled,
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
                color={
                  destructive
                    ? "#C13515"
                    : "#07111F"
                }
              />

              <Text
                style={[
                  styles.confirmButtonText,
                  destructive
                    ? styles.destructiveButtonText
                    : styles.primaryButtonText,
                ]}
              >
                {loading ? "Please wait..." : confirmText}
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 22,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,

    elevation: 8,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  normalIconContainer: {
    backgroundColor: "#EAF8FC",
  },

  destructiveIconContainer: {
    backgroundColor: "#FDEEEE",
  },

  title: {
    color: "#222222",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  message: {
    color: "#717171",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
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
    paddingHorizontal: 12,
  },

  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },

  cancelButtonText: {
    color: "#222222",
    fontSize: 15,
    fontWeight: "700",
  },

  confirmButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  destructiveButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0A6A6",
  },

  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  primaryButtonText: {
    color: "#07111F",
  },

  destructiveButtonText: {
    color: "#C13515",
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.55,
  },
});