import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ConfirmModal from "../../components/ConfirmModal";
import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditGameScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [area, setArea] = useState("");
  const [distance, setDistance] = useState("");

  const [gameDate, setGameDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [format, setFormat] = useState("");
  const [skill, setSkill] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [spotsLeft, setSpotsLeft] = useState(0);

  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [cancelling, setCancelling] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadGame();
  }, [id]);

  async function loadGame() {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("games")
      .select(
        `
          id,
          title,
          organizer,
          area,
          distance,
          time,
          format,
          skill,
          price,
          spots_left,
          status,
          image_url,
          starts_at,
          ends_at
        `,
      )
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.log("Load game error:", error.message);

      setLoading(false);
      return;
    }

    if (!data) {
      setLoading(false);
      return;
    }

    setTitle(data.title || "");

    setOrganizer(data.organizer || "");

    setArea(data.area || "");

    setDistance(data.distance || "");

    setFormat(data.format || "");

    setSkill(data.skill || "");

    setPrice(
      data.price !== null && data.price !== undefined ? String(data.price) : "",
    );

    setImageUrl(data.image_url || "");

    setSpotsLeft(data.spots_left || 0);

    setStatus(data.status || "available");

    /*
      New games have real timestamps.

      Convert the stored UTC timestamp
      back into Addis Ababa date/time
      for editing.
    */
    if (data.starts_at && data.ends_at) {
      setGameDate(formatAddisDate(data.starts_at));

      setStartTime(formatAddisTime(data.starts_at));

      setEndTime(formatAddisTime(data.ends_at));
    } else {
      /*
        Legacy games created before
        starts_at / ends_at existed.

        Leave schedule fields empty.
        Admin can add a real schedule
        when editing them.
      */
      setGameDate("");
      setStartTime("");
      setEndTime("");
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!id) {
      return;
    }

    if (status === "cancelled") {
      showMessage("Game cancelled", "A cancelled game cannot be edited.");

      return;
    }

    if (!title.trim()) {
      showMessage("Missing information", "Game title is required.");

      return;
    }

    if (!organizer.trim()) {
      showMessage("Missing information", "Organizer is required.");

      return;
    }

    if (!area.trim()) {
      showMessage("Missing information", "Area is required.");

      return;
    }

    if (!gameDate.trim()) {
      showMessage("Missing information", "Game date is required.");

      return;
    }

    if (!startTime.trim()) {
      showMessage("Missing information", "Start time is required.");

      return;
    }

    if (!endTime.trim()) {
      showMessage("Missing information", "End time is required.");

      return;
    }

    if (!format.trim()) {
      showMessage("Missing information", "Game format is required.");

      return;
    }

    if (!skill.trim()) {
      showMessage("Missing information", "Skill level is required.");

      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      showMessage("Invalid price", "Enter a valid price.");

      return;
    }

    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      showMessage("Invalid game", "The game ID is invalid.");

      return;
    }

    const startsAt = parseAddisDateTime(gameDate, startTime);

    const endsAt = parseAddisDateTime(gameDate, endTime);

    if (!startsAt) {
      showMessage(
        "Invalid schedule",
        "Enter the date as YYYY-MM-DD and the start time like 7:00 PM.",
      );

      return;
    }

    if (!endsAt) {
      showMessage(
        "Invalid schedule",
        "Enter the date as YYYY-MM-DD and the end time like 9:00 PM.",
      );

      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      showMessage("Invalid schedule", "End time must be after start time.");

      return;
    }

    const displayTime = `${startTime.trim()} to ${endTime.trim()}`;

    setSaving(true);

    const { error } = await supabase.rpc("update_game", {
      p_game_id: numericId,

      p_title: title.trim(),

      p_organizer: organizer.trim(),

      p_area: area.trim(),

      p_distance: distance.trim(),

      p_time: displayTime,

      p_format: format.trim(),

      p_skill: skill.trim(),

      p_price: numericPrice,

      p_starts_at: startsAt.toISOString(),

      p_ends_at: endsAt.toISOString(),

      p_image_url: imageUrl.trim() || null,
    });

    if (error) {
      console.log("Update game error:", error.message);

      setSaving(false);

      showMessage("Could not update game", error.message);

      return;
    }

    setSaving(false);

    router.replace("/admin/manage-games");
  }

  async function cancelGame() {
    if (!id) {
      return;
    }

    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      setShowCancelModal(false);

      showMessage("Invalid game", "The game ID is invalid.");

      return;
    }

    setCancelling(true);

    // 1. Cancel the game.
    // The RPC changes paid bookings to refund_pending.
    const { data: cancelData, error: cancelError } = await supabase.rpc(
      "cancel_game",
      {
        p_game_id: numericId,
      },
    );

    if (cancelError) {
      console.log("Cancel game error:", cancelError.message);

      setCancelling(false);
      setShowCancelModal(false);

      showMessage("Could not cancel game", cancelError.message);

      return;
    }

    console.log("Cancel game result:", cancelData);

    // 2. Always ask the secure backend to process
    // any refunds created by this cancellation.
    //
    // If there are no refund_pending bookings,
    // the backend should simply have nothing to process.
    const { data: refundData, error: refundError } =
      await supabase.functions.invoke("process-game-refunds", {
        body: {
          game_id: numericId,
        },
      });

    console.log("Game refund processing result:", refundData);

    if (refundError) {
      console.log(
        "Game cancelled, but automatic refund processing failed:",
        refundError.message,
      );

      setCancelling(false);
      setShowCancelModal(false);

      showMessage(
        "Game cancelled",
        "The game was cancelled successfully, but automatic refund processing could not start. The refund remains pending.",
      );

      router.replace("/admin/manage-games");

      return;
    }

    const failedRefunds = Number(refundData?.failed ?? 0);

    const initiatedRefunds = Number(
      refundData?.initiated ??
        refundData?.processed ??
        refundData?.started ??
        0,
    );

    setCancelling(false);
    setShowCancelModal(false);

    if (failedRefunds > 0) {
      showMessage(
        "Game cancelled",
        `The game was cancelled. ${failedRefunds} refund${
          failedRefunds === 1 ? "" : "s"
        } still require attention.`,
      );
    } else if (initiatedRefunds > 0) {
      showMessage(
        "Game cancelled",
        `${initiatedRefunds} player refund${
          initiatedRefunds === 1 ? "" : "s"
        } started automatically.`,
      );
    } else {
      showMessage("Game cancelled", "The game was cancelled successfully.");
    }

    router.replace("/admin/manage-games");
  }

  function confirmCancelGame() {
    if (status === "cancelled" || cancelling || saving) {
      return;
    }

    setShowCancelModal(true);
  }

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);

      return;
    }

    Alert.alert(title, message);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />

          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!id || !title) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF747A" />

          <Text style={styles.errorTitle}>Game not found</Text>

          <Pressable
            style={styles.backErrorButton}
            onPress={() => router.replace("/admin/manage-games")}
          >
            <Text style={styles.backErrorText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = status === "cancelled";

  const isFull = status === "full" || spotsLeft <= 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/admin/manage-games")}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />

            <Text style={styles.backText}>Manage Games</Text>
          </Pressable>

          <Text style={styles.title}>Edit Game</Text>

          <Text style={styles.subtitle}>Update game information</Text>

          {isCancelled && (
            <View style={styles.cancelledNotice}>
              <Ionicons name="close-circle" size={25} color="#FF747A" />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={styles.cancelledNoticeTitle}>Game Cancelled</Text>

                <Text style={styles.cancelledNoticeText}>
                  Players can no longer join this game.
                </Text>
              </View>
            </View>
          )}

          {/* CAPACITY */}

          <View style={styles.capacityCard}>
            <View style={styles.capacityIcon}>
              <Ionicons
                name="people-outline"
                size={24}
                color={isCancelled ? "#FF747A" : COLORS.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.capacityTitle}>Current availability</Text>

              <Text style={styles.capacityText}>{spotsLeft} spots left</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isCancelled
                  ? styles.cancelledBadge
                  : isFull
                    ? styles.fullBadge
                    : styles.availableBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isCancelled
                    ? styles.cancelledStatusText
                    : isFull
                      ? styles.fullText
                      : styles.availableText,
                ]}
              >
                {isCancelled ? "Cancelled" : isFull ? "Full" : "Available"}
              </Text>
            </View>
          </View>

          <Text style={styles.capacityHelp}>
            Capacity is managed automatically by bookings, cancellations and the
            waitlist.
          </Text>

          {/* BASIC INFO */}

          <FieldLabel text="Game title" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={title}
            onChangeText={setTitle}
            placeholder="Game title"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          <FieldLabel text="Organizer" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={organizer}
            onChangeText={setOrganizer}
            placeholder="Organizer"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          <FieldLabel text="Area" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={area}
            onChangeText={setArea}
            placeholder="Bole, Addis Ababa"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          <FieldLabel text="Distance" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={distance}
            onChangeText={setDistance}
            placeholder="2.1 km"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          {/* SCHEDULE */}

          <View style={styles.scheduleHeader}>
            <View>
              <Text style={styles.scheduleTitle}>Game Schedule</Text>

              <Text style={styles.scheduleSubtitle}>
                Date and time in Addis Ababa
              </Text>
            </View>

            <View style={styles.timezoneBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />

              <Text style={styles.timezoneText}>Addis Ababa</Text>
            </View>
          </View>

          <FieldLabel text="Game date" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={gameDate}
            onChangeText={setGameDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            editable={!isCancelled}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <FieldLabel text="Start time" />

              <TextInput
                style={[styles.input, isCancelled && styles.disabledInput]}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="7:00 PM"
                placeholderTextColor={COLORS.textMuted}
                editable={!isCancelled}
              />
            </View>

            <View style={styles.timeField}>
              <FieldLabel text="End time" />

              <TextInput
                style={[styles.input, isCancelled && styles.disabledInput]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="9:00 PM"
                placeholderTextColor={COLORS.textMuted}
                editable={!isCancelled}
              />
            </View>
          </View>

          {/* GAME DETAILS */}

          <FieldLabel text="Format" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={format}
            onChangeText={setFormat}
            placeholder="6v6"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          <FieldLabel text="Skill level" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={skill}
            onChangeText={setSkill}
            placeholder="Intermediate"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          <FieldLabel text="Price (ETB)" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={price}
            onChangeText={setPrice}
            placeholder="300"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            editable={!isCancelled}
          />

          <FieldLabel text="Image URL (optional)" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isCancelled}
          />

          {/* ACTIONS */}

          {!isCancelled && (
            <>
              <Pressable
                style={[
                  styles.saveButton,
                  (saving || cancelling) && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={saving || cancelling}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color={COLORS.background}
                    />

                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.cancelButton,
                  (cancelling || saving) && styles.disabledButton,
                ]}
                onPress={confirmCancelGame}
                disabled={cancelling || saving}
              >
                {cancelling ? (
                  <ActivityIndicator color="#FF747A" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={22}
                      color="#FF747A"
                    />

                    <Text style={styles.cancelButtonText}>Cancel Game</Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.cancelHelp}>
                Cancelling keeps the game in your records, but prevents new
                players from joining.
              </Text>
            </>
          )}

          {isCancelled && (
            <View style={styles.cancelledBox}>
              <Ionicons name="close-circle" size={21} color="#FF747A" />

              <Text style={styles.cancelledText}>This game is cancelled</Text>
            </View>
          )}

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showCancelModal}
        title="Cancel Game?"
        message="Players will no longer be able to join this game. The game will remain in your records."
        cancelText="Keep Game"
        confirmText="Cancel Game"
        destructive
        loading={cancelling}
        onCancel={() => {
          if (!cancelling) {
            setShowCancelModal(false);
          }
        }}
        onConfirm={cancelGame}
      />
    </SafeAreaView>
  );
}

/*
  Convert a Supabase timestamp into
  YYYY-MM-DD using Addis Ababa time.
*/
function formatAddisDate(timestamp: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(timestamp));
}

/*
  Convert timestamp into something
  like 7:00 PM in Addis Ababa.
*/
function formatAddisTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

/*
  Parse admin input explicitly as
  Addis Ababa time.

  Ethiopia is UTC+03:00.
*/
function parseAddisDateTime(dateText: string, timeText: string) {
  const dateMatch = dateText.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);

  const month = Number(dateMatch[2]);

  const day = Number(dateMatch[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const timeMatch = timeText
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

  if (!timeMatch) {
    return null;
  }

  let hour = Number(timeMatch[1]);

  const minute = Number(timeMatch[2]);

  const period = timeMatch[3];

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }

  const iso =
    `${String(year).padStart(4, "0")}-${String(month).padStart(
      2,
      "0",
    )}-${String(day).padStart(2, "0")}` +
    `T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )}:00+03:00`;

  const result = new Date(iso);

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  return result;
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 14,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  errorTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 14,
  },

  backErrorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 22,
  },

  backErrorText: {
    color: COLORS.background,
    fontWeight: "800",
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 7,
    marginBottom: 14,
  },

  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 4,
    marginBottom: 22,
  },

  cancelledNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#211718",
    borderWidth: 1,
    borderColor: "#6A3538",
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
  },

  cancelledNoticeTitle: {
    color: "#FF747A",
    fontSize: 15,
    fontWeight: "800",
  },

  cancelledNoticeText: {
    color: "#C69B9D",
    fontSize: 12,
    marginTop: 2,
  },

  capacityCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  capacityIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#0B1726",
    alignItems: "center",
    justifyContent: "center",
  },

  capacityTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  capacityText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },

  capacityHelp: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 22,
  },

  statusBadge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  availableBadge: {
    backgroundColor: "#0B5C35",
  },

  fullBadge: {
    backgroundColor: "#332A17",
  },

  cancelledBadge: {
    backgroundColor: "#3A2022",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  availableText: {
    color: "#71E49A",
  },

  fullText: {
    color: "#F6C85F",
  },

  cancelledStatusText: {
    color: "#FF9A9E",
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
  },

  disabledInput: {
    opacity: 0.45,
  },

  scheduleHeader: {
    marginTop: 28,
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  scheduleTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  scheduleSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  timezoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0B1726",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  timezoneText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  timeRow: {
    flexDirection: "row",
    gap: 10,
  },

  timeField: {
    flex: 1,
  },

  saveButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 30,
  },

  saveButtonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "800",
  },

  cancelButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7A3437",
    backgroundColor: "#160B0C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
  },

  cancelButtonText: {
    color: "#FF747A",
    fontSize: 15,
    fontWeight: "800",
  },

  cancelHelp: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },

  disabledButton: {
    opacity: 0.55,
  },

  cancelledBox: {
    marginTop: 25,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6A3538",
    backgroundColor: "#211718",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  cancelledText: {
    color: "#FF9A9E",
    fontSize: 14,
    fontWeight: "800",
  },
});
