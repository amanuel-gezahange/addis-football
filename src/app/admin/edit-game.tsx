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

import { useLanguage } from "../../i18n/LanguageContext";

export default function EditGameScreen() {
  const { t } = useLanguage();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [title, setTitle] = useState("");

  const [organizer, setOrganizer] = useState("");

  const [area, setArea] = useState("");

  const [city, setCity] = useState("Addis Ababa");

  const [mapsUrl, setMapsUrl] = useState("");

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

  const [paymentMethod, setPaymentMethod] = useState<
    "free" | "venue" | "organizer"
  >("organizer");

  const [paymentProvider, setPaymentProvider] = useState("");

  const [paymentPhone, setPaymentPhone] = useState("");

  const [paymentAccountName, setPaymentAccountName] = useState("");

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

          city,

          maps_url,



          distance,



          time,



          format,



          skill,



     price,



payment_method,



payment_provider,



payment_phone,



payment_account_name,



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

    setCity(data.city || "Addis Ababa");

    setMapsUrl(data.maps_url || "");

    setDistance(data.distance || "");

    setFormat(data.format || "");

    setSkill(data.skill || "");

    setPrice(
      data.price !== null && data.price !== undefined ? String(data.price) : "",
    );

    setPaymentMethod(
      data.payment_method === "free" ||
        data.payment_method === "venue" ||
        data.payment_method === "organizer"
        ? data.payment_method
        : "organizer",
    );

    setPaymentProvider(data.payment_provider || "");

    setPaymentPhone(data.payment_phone || "");

    setPaymentAccountName(data.payment_account_name || "");

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
      showMessage(
        t("editGame.gameCancelled"),

        t("editGame.cancelledCannotEdit"),
      );

      return;
    }

    if (!title.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.gameTitleRequired"),
      );

      return;
    }

    if (!organizer.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.organizerRequired"),
      );

      return;
    }

    if (!area.trim()) {
      showMessage(t("editGame.missingInformation"), t("editGame.areaRequired"));

      return;
    }

    if (!city.trim()) {
      showMessage(t("editGame.missingInformation"), "City is required");
      return;
    }

    if (!gameDate.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.gameDateRequired"),
      );

      return;
    }

    if (!startTime.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.startTimeRequired"),
      );

      return;
    }

    if (!endTime.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.endTimeRequired"),
      );

      return;
    }

    if (!format.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.formatRequired"),
      );

      return;
    }

    if (!skill.trim()) {
      showMessage(
        t("editGame.missingInformation"),

        t("editGame.skillLevelRequired"),
      );

      return;
    }

    const numericPrice = paymentMethod === "free" ? 0 : Number(price);

    if (paymentMethod !== "free") {
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        showMessage(
          t("editGame.invalidPrice"),

          t("editGame.priceGreaterThanZero"),
        );

        return;
      }
    }

    if (paymentMethod === "organizer") {
      if (!paymentProvider.trim()) {
        showMessage(
          t("editGame.missingPaymentInformation"),

          t("editGame.paymentProviderRequired"),
        );

        return;
      }

      if (!paymentPhone.trim()) {
        showMessage(
          t("editGame.missingPaymentInformation"),

          t("editGame.paymentPhoneRequired"),
        );

        return;
      }

      if (!paymentAccountName.trim()) {
        showMessage(
          t("editGame.missingPaymentInformation"),

          t("editGame.paymentAccountNameRequired"),
        );

        return;
      }
    }

    const numericId = Number(id);

    if (!Number.isInteger(numericId)) {
      showMessage(t("editGame.invalidGame"), t("editGame.invalidGameId"));

      return;
    }

    const startsAt = parseAddisDateTime(gameDate, startTime);

    const endsAt = parseAddisDateTime(gameDate, endTime);

    if (!startsAt) {
      showMessage(
        t("editGame.invalidSchedule"),

        t("editGame.invalidStartSchedule"),
      );

      return;
    }

    if (!endsAt) {
      showMessage(
        t("editGame.invalidSchedule"),

        t("editGame.invalidEndSchedule"),
      );

      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      showMessage(t("editGame.invalidSchedule"), t("editGame.endAfterStart"));

      return;
    }

    const displayTime = `${startTime.trim()} to ${endTime.trim()}`;

    setSaving(true);

    const { error } = await supabase.rpc("update_game", {
      p_game_id: numericId,

      p_title: title.trim(),

      p_organizer: organizer.trim(),

      p_area: area.trim(),

      p_city: city.trim(),

      p_maps_url: mapsUrl.trim() || null,

      p_distance: distance.trim(),

      p_time: displayTime,

      p_format: format.trim(),

      p_skill: skill.trim(),

      p_price: numericPrice,

      p_starts_at: startsAt.toISOString(),

      p_ends_at: endsAt.toISOString(),

      p_image_url: imageUrl.trim() || null,

      p_payment_method: paymentMethod,

      p_payment_provider:
        paymentMethod === "organizer" ? paymentProvider.trim() : null,

      p_payment_phone:
        paymentMethod === "organizer" ? paymentPhone.trim() : null,

      p_payment_account_name:
        paymentMethod === "organizer" ? paymentAccountName.trim() : null,
    });

    if (error) {
      console.log("Update game error:", error.message);

      setSaving(false);

      showMessage(t("editGame.couldNotUpdateGame"), error.message);

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

      showMessage(t("editGame.invalidGame"), t("editGame.invalidGameId"));

      return;
    }

    setCancelling(true);

    // Cancel the game and its active bookings.

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

      showMessage(t("editGame.couldNotCancelGame"), cancelError.message);

      return;
    }

    console.log("Cancel game result:", cancelData);

    const cancelResult = Array.isArray(cancelData) ? cancelData[0] : cancelData;

    /*



      * Organizer-direct payments are NOT processed through



      * the old Chapa refund system.



      *



      * The organizer received the money directly, so any refund



      * must be handled directly by the organizer.



     */

    if (paymentMethod === "organizer") {
      const organizerRefundCount = Number(
        cancelResult?.organizer_refund_bookings ?? 0,
      );

      if (organizerRefundCount > 0) {
        console.log(
          `${organizerRefundCount} player(s) paid the organizer directly and may require a manual refund.`,
        );
      }

      setCancelling(false);

      setShowCancelModal(false);

      router.replace("/admin/manage-games");

      return;
    }

    /*



      * Free and pay-at-venue games do not need payment refunds.



     */

    if (paymentMethod === "free" || paymentMethod === "venue") {
      setCancelling(false);

      setShowCancelModal(false);

      showMessage(
        t("editGame.gameCancelled"),

        t("editGame.cancelledSuccessfully"),
      );

      router.replace("/admin/manage-games");

      return;
    }

    /*



      * Legacy/integrated paid games:



      * preserve the existing automatic refund system.



     */

    const refundPendingCount = Number(
      cancelResult?.refund_pending_bookings ?? 0,
    );

    if (refundPendingCount <= 0) {
      setCancelling(false);

      setShowCancelModal(false);

      showMessage(
        t("editGame.gameCancelled"),

        t("editGame.cancelledSuccessfully"),
      );

      router.replace("/admin/manage-games");

      return;
    }

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
        t("editGame.gameCancelled"),

        t("editGame.refundProcessingCouldNotStart"),
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
      showMessage(
        t("editGame.gameCancelled"),

        t("editGame.cancelledSuccessfully"),
      );
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

          <Text style={styles.loadingText}>{t("editGame.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!id || !title) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF747A" />

          <Text style={styles.errorTitle}>{t("editGame.gameNotFound")}</Text>

          <Pressable
            style={styles.backErrorButton}

            onPress={() => router.replace("/admin/manage-games")}
          >
            <Text style={styles.backErrorText}>
              {t("editGame.backToGames")}
            </Text>
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

            <Text style={styles.backText}>{t("editGame.manageGames")}</Text>
          </Pressable>

          <Text style={styles.title}>{t("editGame.title")}</Text>

          <Text style={styles.subtitle}>{t("editGame.subtitle")}</Text>

          {isCancelled && (
            <View style={styles.cancelledNotice}>
              <Ionicons name="close-circle" size={25} color="#FF747A" />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text style={styles.cancelledNoticeTitle}>
                  {t("editGame.gameCancelled")}
                </Text>

                <Text style={styles.cancelledNoticeText}>
                  {t("editGame.playersCannotJoin")}
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
              <Text style={styles.capacityTitle}>
                {t("editGame.currentAvailability")}
              </Text>

              <Text style={styles.capacityText}>
                {spotsLeft} {t("editGame.spotsLeft")}
              </Text>
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
                {isCancelled
                  ? t("editGame.cancelled")
                  : isFull
                    ? t("editGame.full")
                    : t("editGame.available")}
              </Text>
            </View>
          </View>

          <Text style={styles.capacityHelp}>{t("editGame.capacityHelp")}</Text>

          {/* BASIC INFO */}

          <FieldLabel text={t("editGame.gameTitle")} />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}

            value={title}

            onChangeText={setTitle}

            placeholder={t("editGame.gameTitle")}

            placeholderTextColor={COLORS.textMuted}

            editable={!isCancelled}
          />

          <FieldLabel text={t("editGame.organizer")} />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}

            value={organizer}

            onChangeText={setOrganizer}

            placeholder={t("editGame.organizer")}

            placeholderTextColor={COLORS.textMuted}

            editable={!isCancelled}
          />

          <FieldLabel text={t("editGame.area")} />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}

            value={area}

            onChangeText={setArea}

            placeholder="Bole, Addis Ababa"

            placeholderTextColor={COLORS.textMuted}

            editable={!isCancelled}
          />

          <FieldLabel text="City" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={city}
            onChangeText={setCity}
            placeholder="Addis Ababa"
            placeholderTextColor={COLORS.textMuted}
            editable={!isCancelled}
          />

          <FieldLabel text="Google Maps link (optional)" />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}
            value={mapsUrl}
            onChangeText={setMapsUrl}
            placeholder="https://maps.google.com/..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            editable={!isCancelled}
          />

          <FieldLabel text={t("editGame.distance")} />

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
              <Text style={styles.scheduleTitle}>
                {t("editGame.gameSchedule")}
              </Text>

              <Text style={styles.scheduleSubtitle}>
                {t("editGame.scheduleHint")}
              </Text>
            </View>

            <View style={styles.timezoneBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />

              <Text style={styles.timezoneText}>Addis Ababa</Text>
            </View>
          </View>

          <FieldLabel text={t("editGame.gameDate")} />

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
              <FieldLabel text={t("editGame.startTime")} />

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
              <FieldLabel text={t("editGame.endTime")} />

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

          <FieldLabel text={t("editGame.format")} />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}

            value={format}

            onChangeText={setFormat}

            placeholder="6v6"

            placeholderTextColor={COLORS.textMuted}

            editable={!isCancelled}
          />

          <FieldLabel text={t("editGame.skillLevel")} />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}

            value={skill}

            onChangeText={setSkill}

            placeholder="Intermediate"

            placeholderTextColor={COLORS.textMuted}

            editable={!isCancelled}
          />

          <View style={styles.paymentHeader}>
            <Text style={styles.paymentTitle}>{t("editGame.payment")}</Text>

            <Text style={styles.paymentSubtitle}>
              {t("editGame.paymentSubtitle")}
            </Text>
          </View>

          <View style={styles.paymentOptions}>
            <PaymentOption
              title={t("editGame.free")}

              subtitle={t("editGame.freeSubtitle")}

              icon="gift-outline"

              selected={paymentMethod === "free"}

              disabled={isCancelled}

              onPress={() => {
                setPaymentMethod("free");

                setPrice("0");
              }}
            />

            <PaymentOption
              title={t("editGame.payAtVenue")}

              subtitle={t("editGame.payAtVenueSubtitle")}

              icon="location-outline"

              selected={paymentMethod === "venue"}

              disabled={isCancelled}

              onPress={() => {
                setPaymentMethod("venue");

                if (price === "0") setPrice("");
              }}
            />

            <PaymentOption
              title={t("editGame.payOrganizerDirectly")}

              subtitle={t("editGame.payOrganizerSubtitle")}

              icon="phone-portrait-outline"

              selected={paymentMethod === "organizer"}

              disabled={isCancelled}

              onPress={() => {
                setPaymentMethod("organizer");

                if (price === "0") setPrice("");
              }}
            />
          </View>

          {paymentMethod !== "free" && (
            <>
              <FieldLabel text={t("editGame.priceEtb")} />

              <TextInput
                style={[styles.input, isCancelled && styles.disabledInput]}

                value={price}

                onChangeText={setPrice}

                placeholder="300"

                placeholderTextColor={COLORS.textMuted}

                keyboardType="numeric"

                editable={!isCancelled}
              />
            </>
          )}

          {paymentMethod === "organizer" && (
            <View style={styles.organizerPaymentBox}>
              <Text style={styles.organizerPaymentTitle}>
                {t("editGame.organizerPaymentDetails")}
              </Text>

              <Text style={styles.organizerPaymentHelp}>
                {t("editGame.organizerPaymentHelp")}
              </Text>

              <FieldLabel text={t("editGame.paymentProvider")} />

              <TextInput
                style={[styles.input, isCancelled && styles.disabledInput]}

                value={paymentProvider}

                onChangeText={setPaymentProvider}

                placeholder="Telebirr"

                placeholderTextColor={COLORS.textMuted}

                editable={!isCancelled}
              />

              <FieldLabel text={t("editGame.paymentPhoneNumber")} />

              <TextInput
                style={[styles.input, isCancelled && styles.disabledInput]}

                value={paymentPhone}

                onChangeText={setPaymentPhone}

                placeholder="09XXXXXXXX"

                placeholderTextColor={COLORS.textMuted}

                keyboardType="phone-pad"

                editable={!isCancelled}
              />

              <FieldLabel text={t("editGame.accountName")} />

              <TextInput
                style={[styles.input, isCancelled && styles.disabledInput]}

                value={paymentAccountName}

                onChangeText={setPaymentAccountName}

                placeholder={t("editGame.accountHolderName")}

                placeholderTextColor={COLORS.textMuted}

                editable={!isCancelled}
              />
            </View>
          )}

          <FieldLabel text={t("editGame.imageUrlOptional")} />

          <TextInput
            style={[styles.input, isCancelled && styles.disabledInput]}

            value={imageUrl}

            onChangeText={setImageUrl}

            placeholder="https\://..."

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

                    <Text style={styles.saveButtonText}>
                      {t("editGame.saveChanges")}
                    </Text>
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

                    <Text style={styles.cancelButtonText}>
                      {t("editGame.cancelGame")}
                    </Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.cancelHelp}>{t("editGame.cancelHelp")}</Text>
            </>
          )}

          {isCancelled && (
            <View style={styles.cancelledBox}>
              <Ionicons name="close-circle" size={21} color="#FF747A" />

              <Text style={styles.cancelledText}>
                {t("editGame.thisGameCancelled")}
              </Text>
            </View>
          )}

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showCancelModal}

        title={t("editGame.cancelGameQuestion")}

        message={
          paymentMethod === "organizer"
            ? t("editGame.cancelOrganizerMessage")
            : t("editGame.cancelStandardMessage")
        }

        cancelText={t("editGame.keepGame")}

        confirmText={t("editGame.cancelGame")}

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

function PaymentOption({
  title,

  subtitle,

  icon,

  selected,

  disabled,

  onPress,
}: {
  title: string;

  subtitle: string;

  icon: keyof typeof Ionicons.glyphMap;

  selected: boolean;

  disabled: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.paymentOption,

        selected && styles.paymentOptionSelected,

        disabled && styles.disabledInput,
      ]}

      onPress={onPress}

      disabled={disabled}
    >
      <View
        style={[
          styles.paymentOptionIcon,

          selected && styles.paymentOptionIconSelected,
        ]}
      >
        <Ionicons
          name={icon}

          size={21}

          color={selected ? COLORS.primary : COLORS.textSecondary}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.paymentOptionTitle,

            selected && styles.paymentOptionTitleSelected,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.paymentOptionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}

        size={22}

        color={selected ? COLORS.primary : COLORS.textMuted}
      />
    </Pressable>
  );
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

  paymentHeader: {
    marginTop: 28,

    marginBottom: 12,
  },

  paymentTitle: {
    color: COLORS.text,

    fontSize: 18,

    fontWeight: "800",
  },

  paymentSubtitle: {
    color: COLORS.textMuted,

    fontSize: 12,

    marginTop: 3,
  },

  paymentOptions: {
    gap: 10,
  },

  paymentOption: {
    minHeight: 72,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.surface,

    borderRadius: 15,

    paddingHorizontal: 13,

    paddingVertical: 12,

    flexDirection: "row",

    alignItems: "center",

    gap: 11,
  },

  paymentOptionSelected: {
    borderColor: COLORS.primary,

    backgroundColor: "#0B1726",
  },

  paymentOptionIcon: {
    width: 42,

    height: 42,

    borderRadius: 13,

    backgroundColor: COLORS.background,

    alignItems: "center",

    justifyContent: "center",
  },

  paymentOptionIconSelected: {
    backgroundColor: "#10263D",
  },

  paymentOptionTitle: {
    color: COLORS.text,

    fontSize: 14,

    fontWeight: "800",
  },

  paymentOptionTitleSelected: {
    color: COLORS.primary,
  },

  paymentOptionSubtitle: {
    color: COLORS.textMuted,

    fontSize: 11,

    lineHeight: 16,

    marginTop: 2,
  },

  organizerPaymentBox: {
    marginTop: 16,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.surface,

    borderRadius: 16,

    padding: 14,
  },

  organizerPaymentTitle: {
    color: COLORS.text,

    fontSize: 15,

    fontWeight: "800",
  },

  organizerPaymentHelp: {
    color: COLORS.textMuted,

    fontSize: 11,

    lineHeight: 16,

    marginTop: 3,

    marginBottom: 2,
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
