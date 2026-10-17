import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Clipboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "../constants/theme";
import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../lib/supabase";

const c = Colors.dark;

type BookingStatus = "confirmed" | "waitlisted" | "pending_payment" | null;

type PaymentMethod = "free" | "venue" | "organizer";

type PaymentDetails = {
  payment_method: PaymentMethod;
  payment_provider: string | null;
  payment_phone: string | null;
  payment_account_name: string | null;
};

type Props = {
  gameId: string | number;
  title: string;
  price: number;
  spotsLeft: number;
  status: string | null;
  onSpotsChange?: (spotsLeft: number) => void;
};

export default function GameBookingAction({
  gameId,
  title,
  price,
  spotsLeft: initialSpotsLeft,
  status,
  onSpotsChange,
}: Props) {
  const { t } = useLanguage();

  const [bookingStatus, setBookingStatus] = useState<BookingStatus>(null);

  const [bookingId, setBookingId] = useState<number | null>(null);

  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const [paymentOfferExpiresAt, setPaymentOfferExpiresAt] = useState<
    string | null
  >(null);

  const [offerSecondsLeft, setOfferSecondsLeft] = useState<number | null>(null);

  const [offerExpiredLocally, setOfferExpiredLocally] = useState(false);

  const [joining, setJoining] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const [stateLoading, setStateLoading] = useState(true);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const [spotsLeft, setSpotsLeft] = useState(Number(initialSpotsLeft ?? 0));

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    payment_method: Number(price ?? 0) > 0 ? "organizer" : "free",

    payment_provider: null,
    payment_phone: null,
    payment_account_name: null,
  });

  const numericPrice = Number(price ?? 0);

  const isPaidGame = numericPrice > 0;

  const isFull = status === "full" || spotsLeft <= 0;

  const isConfirmed = bookingStatus === "confirmed";

  const isWaitlisted = bookingStatus === "waitlisted";

  const isPendingPayment = bookingStatus === "pending_payment";

  const isPaymentSubmitted = paymentStatus === "submitted";

  const isOrganizerPayment = paymentDetails.payment_method === "organizer";

  useEffect(() => {
    setSpotsLeft(Number(initialSpotsLeft ?? 0));
  }, [initialSpotsLeft]);

  function updateSpots(nextSpotsLeft: number) {
    setSpotsLeft(nextSpotsLeft);
    onSpotsChange?.(nextSpotsLeft);
  }

  async function loadState() {
    setStateLoading(true);

    const { data: gameRow, error: gameError } = await supabase
      .from("games")
      .select(
        `
          payment_method,
          payment_provider,
          payment_phone,
          payment_account_name,
          spots_left,
          status
        `,
      )
      .eq("id", Number(gameId))
      .single();

    if (!gameError && gameRow) {
      setPaymentDetails({
        payment_method:
          (gameRow.payment_method as PaymentMethod) ??
          (numericPrice > 0 ? "organizer" : "free"),

        payment_provider: gameRow.payment_provider ?? null,

        payment_phone: gameRow.payment_phone ?? null,

        payment_account_name: gameRow.payment_account_name ?? null,
      });

      if (typeof gameRow.spots_left === "number") {
        updateSpots(Number(gameRow.spots_left));
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBookingStatus(null);
      setBookingId(null);
      setPaymentStatus(null);
      setPaymentOfferExpiresAt(null);
      setOfferSecondsLeft(null);
      setOfferExpiredLocally(false);
      setStateLoading(false);
      return;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
          id,
          status,
          payment_status,
          payment_offer_expires_at
        `,
      )
      .eq("user_id", user.id)
      .eq("game_id", Number(gameId))
      .in("status", ["confirmed", "waitlisted", "pending_payment"])
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (bookingError) {
      console.log("Booking check error:", bookingError.message);

      setStateLoading(false);
      return;
    }

    if (!booking?.id) {
      setBookingStatus(null);
      setBookingId(null);
      setPaymentStatus(null);
      setPaymentOfferExpiresAt(null);
      setOfferSecondsLeft(null);
      setOfferExpiredLocally(false);
      setStateLoading(false);
      return;
    }

    setBookingId(Number(booking.id));

    setPaymentStatus(booking.payment_status ?? null);

    const offerExpiry = booking.payment_offer_expires_at ?? null;

    setPaymentOfferExpiresAt(offerExpiry);

    if (
      offerExpiry &&
      booking.status === "pending_payment" &&
      booking.payment_status === "pending"
    ) {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(offerExpiry).getTime() - Date.now()) / 1000),
      );

      setOfferSecondsLeft(seconds);

      setOfferExpiredLocally(seconds <= 0);
    } else {
      setOfferSecondsLeft(null);
      setOfferExpiredLocally(false);
    }

    if (booking.status === "confirmed") {
      setBookingStatus("confirmed");
    } else if (booking.status === "waitlisted") {
      setBookingStatus("waitlisted");
    } else if (booking.status === "pending_payment") {
      setBookingStatus("pending_payment");
    } else {
      setBookingStatus(null);
    }

    setStateLoading(false);
  }

  useEffect(() => {
    loadState();
  }, [gameId, numericPrice]);

  useEffect(() => {
    if (!paymentOfferExpiresAt || !isPendingPayment || isPaymentSubmitted) {
      setOfferSecondsLeft(null);
      return;
    }

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(paymentOfferExpiresAt).getTime() - Date.now()) / 1000,
        ),
      );

      setOfferSecondsLeft(seconds);

      if (seconds <= 0) {
        setOfferExpiredLocally(true);

        setPaymentModalVisible(false);

        setPaymentMessage(t("gameCard.paymentTimeExpired"));
      }
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [paymentOfferExpiresAt, isPendingPayment, isPaymentSubmitted]);

  useEffect(() => {
    if (!offerExpiredLocally) {
      return;
    }

    const refreshExpiredOffer = setInterval(() => loadState(), 2000);

    return () => clearInterval(refreshExpiredOffer);
  }, [offerExpiredLocally, gameId]);

  function formatOfferCountdown(totalSeconds: number | null) {
    if (totalSeconds === null) {
      return null;
    }

    const safeSeconds = Math.max(0, totalSeconds);

    const minutes = Math.floor(safeSeconds / 60);

    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }

  async function handleJoinGame() {
    if (joining) return;

    setPaymentMessage(null);

    if (isConfirmed || isWaitlisted) {
      return;
    }

    if (isPendingPayment) {
      if (offerExpiredLocally) {
        setPaymentModalVisible(false);

        setPaymentMessage(t("gameCard.paymentTimeExpired"));

        await loadState();
        return;
      }

      if (isPaymentSubmitted) {
        setPaymentMessage(t("gameCard.paymentSubmitted"));

        return;
      }

      if (isOrganizerPayment) {
        setPaymentModalVisible(true);
      }

      return;
    }

    if (isFull) {
      await handleNormalJoin();
      return;
    }

    if (
      paymentDetails.payment_method === "free" ||
      paymentDetails.payment_method === "venue" ||
      !isPaidGame
    ) {
      await handleNormalJoin();
      return;
    }

    if (isOrganizerPayment) {
      await handleOrganizerReservation();
      return;
    }

    setPaymentMessage(t("gameCard.paymentMethodNotAvailable"));
  }

  async function handleNormalJoin() {
    setJoining(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPaymentMessage(t("gameCard.signInFirst"));
        return;
      }

      const { data, error } = await supabase.rpc("join_game", {
        p_game_id: Number(gameId),
      });

      if (error) {
        console.log("Join game error:", error.message);

        if (error.message.toLowerCase().includes("already joined")) {
          setPaymentMessage(null);
          await loadState();
          return;
        }

        setPaymentMessage(t("gameCard.bookingCouldNotBeCreated"));

        return;
      }

      if (data?.booking_id) {
        setBookingId(Number(data.booking_id));
      }

      if (data?.booking_status === "confirmed") {
        setBookingStatus("confirmed");
        setSuccessModalVisible(true);
      } else if (data?.booking_status === "waitlisted") {
        setBookingStatus("waitlisted");
      } else if (data?.booking_status === "pending_payment") {
        setBookingStatus("pending_payment");
      }

      if (typeof data?.spots_left === "number") {
        updateSpots(Number(data.spots_left));
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleOrganizerReservation() {
    setJoining(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPaymentMessage(t("gameCard.signInFirst"));

        return;
      }

      const { data, error } = await supabase.rpc(
        "reserve_organizer_paid_game",
        {
          p_game_id: Number(gameId),
        },
      );

      if (error) {
        console.log("Reserve organizer game error:", error.message);

        setPaymentMessage(t("gameCard.couldNotReserve"));

        return;
      }

      if (data?.booking_id) {
        setBookingId(Number(data.booking_id));
      }

      setBookingStatus("pending_payment");

      setPaymentStatus(data?.payment_status ?? "pending");

      if (typeof data?.spots_left === "number") {
        updateSpots(Number(data.spots_left));
      }

      setPaymentMessage(null);

      setPaymentModalVisible(true);
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmitPayment() {
    if (
      offerExpiredLocally ||
      (paymentOfferExpiresAt &&
        new Date(paymentOfferExpiresAt).getTime() <= Date.now())
    ) {
      setPaymentModalVisible(false);

      setOfferExpiredLocally(true);

      setPaymentMessage(t("gameCard.paymentTimeExpired"));

      await loadState();
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("PAYMENT DEBUG USER:", user?.id);

    console.log("PAYMENT DEBUG AUTH ERROR:", authError);

    console.log("PAYMENT DEBUG BOOKING ID:", bookingId);

    if (!bookingId) {
      setPaymentMessage(t("gameCard.bookingNotFound"));

      return;
    }

    setJoining(true);

    try {
      const { data, error } = await supabase.rpc("submit_organizer_payment", {
        p_booking_id: bookingId,

        p_player_reference: null,
      });

      if (error) {
        console.log("Submit organizer payment error:", error.message);

        if (error.message.toLowerCase().includes("expired")) {
          setPaymentModalVisible(false);

          setOfferExpiredLocally(true);

          setPaymentMessage(t("gameCard.paymentTimeExpired"));

          await loadState();
        } else {
          setPaymentMessage(t("gameCard.couldNotSubmitPayment"));
        }

        return;
      }

      if (data?.success) {
        setPaymentStatus("submitted");

        setPaymentMessage(t("gameCard.paymentSubmitted"));

        setPaymentModalVisible(false);
      }
    } finally {
      setJoining(false);
    }
  }

  function getButtonText() {
    if (joining) {
      if (isPendingPayment) {
        return t("gameCard.submittingPayment");
      }

      if (isFull) {
        return t("gameCard.joiningWaitlist");
      }

      if (isOrganizerPayment && isPaidGame) {
        return t("gameCard.reserving");
      }

      return t("gameCard.joining");
    }

    if (isConfirmed) {
      return t("gameCard.joined");
    }

    if (isWaitlisted) {
      return t("gameCard.waitlisted");
    }

    if (isPendingPayment) {
      if (offerExpiredLocally) {
        return t("gameCard.offerExpired");
      }

      if (isPaymentSubmitted) {
        return t("gameCard.waitingForOrganizer");
      }

      return t("gameCard.ivePaid");
    }

    if (isFull) {
      return t("gameCard.joinWaitlist");
    }

    if (isOrganizerPayment && isPaidGame) {
      return t("gameCard.reserveSpot");
    }

    if (paymentDetails.payment_method === "venue") {
      return t("gameCard.reserveSpot");
    }

    return t("gameCard.joinGame");
  }

  const useStackedFooter = isPendingPayment && isPaymentSubmitted;

  const actionDisabled =
    stateLoading ||
    joining ||
    isConfirmed ||
    isWaitlisted ||
    (isPendingPayment && isPaymentSubmitted) ||
    (isPendingPayment && offerExpiredLocally);

  return (
    <>
      <View style={[styles.wrapper, useStackedFooter && styles.wrapperStacked]}>
        <View
          style={[
            styles.footerInfo,
            useStackedFooter && styles.footerInfoStacked,
          ]}
        >
          <Text style={styles.price}>
            {numericPrice === 0 ? t("gameCard.free") : `${numericPrice} ETB`}
          </Text>

          <Text style={[styles.spots, isFull && styles.spotsFull]}>
            {isFull
              ? t("gameCard.gameFull")
              : `${spotsLeft} ${t("gameCard.spotsLeft")}`}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            useStackedFooter && styles.actionButtonStacked,
            isFull && !bookingStatus && styles.waitlistButton,
            (actionDisabled || pressed) && styles.actionButtonPressed,
          ]}
          onPress={handleJoinGame}
          disabled={actionDisabled}
        >
          <Text
            style={[
              styles.actionButtonText,
              isFull && !bookingStatus && styles.waitlistButtonText,
            ]}
          >
            {getButtonText()}
          </Text>

          {joining && (
            <Ionicons name="ellipsis-horizontal" size={18} color="#07111F" />
          )}
        </Pressable>
      </View>

      {isPendingPayment &&
        !isPaymentSubmitted &&
        paymentOfferExpiresAt &&
        !offerExpiredLocally &&
        offerSecondsLeft !== null && (
          <View style={styles.offerCountdown}>
            <Ionicons name="timer-outline" size={19} color="#9A6700" />

            <View style={styles.offerCountdownTextWrap}>
              <Text style={styles.offerCountdownTitle}>
                {t("gameCard.payWithin").replace(
                  "{time}",
                  formatOfferCountdown(offerSecondsLeft) ?? "00:00",
                )}
              </Text>

              <Text style={styles.offerCountdownText}>
                {t("gameCard.completePaymentBeforeTimer")}
              </Text>
            </View>
          </View>
        )}

      {!!paymentMessage && (
        <View style={styles.message}>
          <Ionicons
            name={
              isConfirmed
                ? "checkmark-circle-outline"
                : "information-circle-outline"
            }
            size={18}
            color={isConfirmed ? "#008A3B" : "#9A6700"}
          />

          <Text
            style={[
              styles.messageText,
              isConfirmed && styles.successMessageText,
            ]}
          >
            {paymentMessage}
          </Text>
        </View>
      )}

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <Pressable
              style={styles.successCloseButton}
              onPress={() => setSuccessModalVisible(false)}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color="#8FA1AF" />
            </Pressable>

            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={42} color="#FFFFFF" />
            </View>

            <Text style={styles.successTitle}>
              {t("bookingSuccess.youreIn")}
            </Text>

            <Text style={styles.successGameTitle}>{title}</Text>

            <View style={styles.successSummary}>
              <View style={styles.successSummaryRow}>
                <View style={styles.successSummaryIcon}>
                  <Ionicons name="checkmark-circle" size={21} color="#149447" />
                </View>

                <View style={styles.successSummaryTextWrap}>
                  <Text style={styles.successSummaryTitle}>
                    {t("bookingSuccess.bookingConfirmed")}
                  </Text>
                  <Text style={styles.successSummaryText}>
                    {spotsLeft} {t("gameCard.spotsLeft")}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.successDoneButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                setSuccessModalVisible(false);
                router.push("/bookings");
              }}
            >
              <Text style={styles.successDoneButtonText}>
                {t("bookingSuccess.viewMyBookings")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPaymentModalVisible(false)}
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{t("gameCard.payOrganizer")}</Text>

            <Text style={styles.modalSubtitle}>
              {title} • {numericPrice} ETB
            </Text>

            <View style={styles.accountCard}>
              <View style={styles.providerRow}>
                <View style={styles.providerIcon}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color="#18C8FF"
                  />
                </View>

                <Text style={styles.providerName}>
                  {paymentDetails.payment_provider ?? "Telebirr"}
                </Text>
              </View>

              <View style={styles.numberRow}>
                <Text style={styles.phoneNumber}>
                  {paymentDetails.payment_phone ?? t("gameCard.notProvided")}
                </Text>

                {!!paymentDetails.payment_phone && (
                  <Pressable
                    style={styles.copyButton}
                    onPress={() =>
                      Clipboard.setString(
                        paymentDetails.payment_phone as string,
                      )
                    }
                  >
                    <Ionicons name="copy-outline" size={17} color="#18C8FF" />

                    <Text style={styles.copyText}>{t("gameCard.copy")}</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.accountName}>
                {paymentDetails.payment_account_name ??
                  t("gameCard.accountNameNotProvided")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#8FA1AF"
              />

              <Text style={styles.modalInstructions}>
                {paymentOfferExpiresAt && offerSecondsLeft !== null
                  ? t("gameCard.sendPaymentBeforeExpiry")
                      .replace("{price}", String(numericPrice))
                      .replace(
                        "{time}",
                        formatOfferCountdown(offerSecondsLeft) ?? "00:00",
                      )
                  : t("gameCard.sendPaymentPending").replace(
                      "{price}",
                      String(numericPrice),
                    )}
              </Text>
            </View>

            <Pressable
              style={[
                styles.modalPaidButton,
                (joining || offerExpiredLocally) && styles.disabledButton,
              ]}
              onPress={handleSubmitPayment}
              disabled={joining || offerExpiredLocally}
            >
              <Text style={styles.modalPaidButtonText}>
                {joining
                  ? t("gameCard.submittingPayment")
                  : t("gameCard.ivePaid")}
              </Text>
            </Pressable>

            <Pressable
              style={styles.payLaterButton}
              onPress={() => setPaymentModalVisible(false)}
              disabled={joining}
            >
              <Text style={styles.payLaterText}>{t("gameCard.payLater")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 86,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },

  footerInfo: {
    flexShrink: 1,
    minWidth: 0,
  },

  wrapperStacked: {
    minHeight: 0,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },

  footerInfoStacked: {
    width: "100%",
  },

  price: {
    color: "#222222",
    fontSize: 18,
    fontWeight: "800",
  },

  spots: {
    color: "#717171",
    fontSize: 12,
    marginTop: 2,
  },

  spotsFull: {
    color: "#C13515",
    fontWeight: "600",
  },

  actionButton: {
    minWidth: 142,
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: c.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  actionButtonStacked: {
    width: "100%",
    minWidth: 0,
  },

  actionButtonText: {
    color: "#07111F",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  waitlistButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#087EA4",
  },

  waitlistButtonText: {
    color: "#087EA4",
  },

  actionButtonPressed: {
    opacity: 0.65,
  },

  offerCountdown: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#FFF8E7",
    borderTopWidth: 1,
    borderTopColor: "#F2D38B",
    paddingHorizontal: 20,
    paddingVertical: 11,
  },

  offerCountdownTextWrap: {
    flex: 1,
  },

  offerCountdownTitle: {
    color: "#7A5200",
    fontSize: 15,
    fontWeight: "800",
  },

  offerCountdownText: {
    color: "#7A6540",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  message: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E7",
    borderTopWidth: 1,
    borderTopColor: "#F2D38B",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  messageText: {
    color: "#7A5200",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  successMessageText: {
    color: "#008A3B",
  },

  disabledButton: {
    opacity: 0.65,
  },

  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 11, 18, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  successCard: {
    position: "relative",
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#07111F",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#183044",
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 22,
    alignItems: "center",
  },

  successCloseButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#102231",
    alignItems: "center",
    justifyContent: "center",
  },

  successIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#149447",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  successTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.7,
    textAlign: "center",
  },

  successGameTitle: {
    color: "#AFC0CD",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 7,
  },

  successSummary: {
    width: "100%",
    backgroundColor: "#102231",
    borderWidth: 1,
    borderColor: "#1C3A4E",
    borderRadius: 18,
    padding: 15,
    marginTop: 24,
  },

  successSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  successSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E9F8EF",
    alignItems: "center",
    justifyContent: "center",
  },

  successSummaryTextWrap: {
    flex: 1,
  },

  successSummaryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  successSummaryText: {
    color: "#8FA1AF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },

  successDoneButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  successDoneButtonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "900",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B0B0B0",
    alignSelf: "center",
    marginBottom: 17,
  },

  modalTitle: {
    color: "#222222",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

  modalSubtitle: {
    color: "#717171",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 18,
  },

  accountCard: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 16,
    padding: 16,
  },

  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },

  providerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  providerName: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "800",
  },

  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  phoneNumber: {
    color: "#222222",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3,
    flexShrink: 1,
  },

  copyButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EAF9FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  copyText: {
    color: "#087EA4",
    fontSize: 14,
    fontWeight: "800",
  },

  accountName: {
    color: "#717171",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 7,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 15,
    marginBottom: 17,
  },

  modalInstructions: {
    color: "#717171",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  modalPaidButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  modalPaidButtonText: {
    color: "#07111F",
    fontSize: 17,
    fontWeight: "900",
  },

  payLaterButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  payLaterText: {
    color: "#717171",
    fontSize: 15,
    fontWeight: "700",
  },
});
