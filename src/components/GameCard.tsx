import { Ionicons } from "@expo/vector-icons";

import { useEffect, useState } from "react";

import {
  Clipboard,
  
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "../constants/theme";

import { useLanguage } from "../i18n/LanguageContext";

import { supabase } from "../lib/supabase";

import { Game } from "../types/game";

const c = Colors.dark;

type Props = {
  game: Game;
};

type BookingStatus = "confirmed" | "waitlisted" | "pending_payment" | null;

type PaymentMethod = "free" | "venue" | "organizer";

type PaymentDetails = {
  payment_method: PaymentMethod;

  payment_provider: string | null;

  payment_phone: string | null;

  payment_account_name: string | null;
};

export default function GameCard({ game }: Props) {
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

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const [spotsLeft, setSpotsLeft] = useState(Number(game.spotsLeft ?? 0));

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    payment_method: Number(game.price ?? 0) > 0 ? "organizer" : "free",

    payment_provider: null,

    payment_phone: null,

    payment_account_name: null,
  });

  const price = Number(game.price ?? 0);

  const isPaidGame = price > 0;

  const isFull = game.status === "full" || spotsLeft <= 0;

  const isConfirmed = bookingStatus === "confirmed";

  const isWaitlisted = bookingStatus === "waitlisted";

  const isPendingPayment = bookingStatus === "pending_payment";

  const isPaymentSubmitted = paymentStatus === "submitted";

  const isOrganizerPayment = paymentDetails.payment_method === "organizer";

  const locationGame = game as Game & {
    city?: string | null;
    maps_url?: string | null;
  };

  async function openGameLocation() {
    const area = String(game.area ?? "").trim();
    const city = String(locationGame.city ?? "").trim();
    const savedMapsUrl = String(locationGame.maps_url ?? "").trim();

    const targetUrl = savedMapsUrl
      ? savedMapsUrl
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [area, city].filter(Boolean).join(", "),
        )}`;

    if (!targetUrl) return;

    try {
      await Linking.openURL(targetUrl);
    } catch (error) {
      console.log("Could not open game location:", error);
    }
  }

  function getSkillLabel(skill: string) {
    const normalized = skill.trim().toLowerCase();

    if (normalized === "all levels") {
      return t("gameCard.allLevels");
    }

    if (normalized === "beginner") {
      return t("gameCard.beginner");
    }

    if (normalized === "intermediate") {
      return t("gameCard.intermediate");
    }

    if (normalized === "advanced") {
      return t("gameCard.advanced");
    }

    return skill;
  }

  useEffect(() => {
    setSpotsLeft(Number(game.spotsLeft ?? 0));
  }, [game.spotsLeft]);

  async function loadState() {
    const { data: gameRow, error: gameError } = await supabase

      .from("games")

      .select(
        "payment_method,payment_provider,payment_phone,payment_account_name,spots_left,status",
      )

      .eq("id", Number(game.id))

      .single();

    if (!gameError && gameRow) {
      setPaymentDetails({
        payment_method:
          (gameRow.payment_method as PaymentMethod) ??
          (price > 0 ? "organizer" : "free"),

        payment_provider: gameRow.payment_provider ?? null,

        payment_phone: gameRow.payment_phone ?? null,

        payment_account_name: gameRow.payment_account_name ?? null,
      });

      if (typeof gameRow.spots_left === "number")
        setSpotsLeft(Number(gameRow.spots_left));
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

      return;
    }

    const { data: booking, error: bookingError } = await supabase

      .from("bookings")

      .select("id,status,payment_status,payment_offer_expires_at")

      .eq("user_id", user.id)

      .eq("game_id", Number(game.id))

      .in("status", ["confirmed", "waitlisted", "pending_payment"])

      .order("created_at", { ascending: false })

      .limit(1)

      .maybeSingle();

    if (bookingError) {
      console.log("Booking check error:", bookingError.message);

      return;
    }

    if (!booking?.id) {
      setBookingStatus(null);

      setBookingId(null);

      setPaymentStatus(null);

      setPaymentOfferExpiresAt(null);

      setOfferSecondsLeft(null);

      setOfferExpiredLocally(false);

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
  }

  useEffect(() => {
    loadState();
  }, [game.id, price]);

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
    if (!offerExpiredLocally) return;

    const refreshExpiredOffer = setInterval(() => loadState(), 2000);

    return () => clearInterval(refreshExpiredOffer);
  }, [offerExpiredLocally, game.id]);

  function formatOfferCountdown(totalSeconds: number | null) {
    if (totalSeconds === null) return null;

    const safeSeconds = Math.max(0, totalSeconds);

    const minutes = Math.floor(safeSeconds / 60);

    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
        p_game_id: Number(game.id),
      });

      if (error) {
        console.log("Join game error:", error.message);

        setPaymentMessage(t("gameCard.bookingCouldNotBeCreated"));

        return;
      }

      if (data?.booking_id) {
        setBookingId(Number(data.booking_id));
      }

      if (data?.booking_status === "confirmed") {
        setBookingStatus("confirmed");
      } else if (data?.booking_status === "waitlisted") {
        setBookingStatus("waitlisted");
      } else if (data?.booking_status === "pending_payment") {
        setBookingStatus("pending_payment");
      }

      if (typeof data?.spots_left === "number") {
        setSpotsLeft(Number(data.spots_left));
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
          p_game_id: Number(game.id),
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
        setSpotsLeft(Number(data.spots_left));
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
      if (isPendingPayment) return t("gameCard.submittingPayment");

      if (isFull) return t("gameCard.joiningWaitlist");

      if (isOrganizerPayment && isPaidGame) return t("gameCard.reserving");

      return t("gameCard.joining");
    }

    if (isConfirmed) return t("gameCard.joined");

    if (isWaitlisted) return t("gameCard.waitlisted");

    if (isPendingPayment) {
      if (offerExpiredLocally) return t("gameCard.offerExpired");

      if (isPaymentSubmitted) return t("gameCard.waitingForOrganizer");

      return t("gameCard.ivePaid");
    }

    if (isFull) return t("gameCard.joinWaitlist");

    if (isOrganizerPayment && isPaidGame) {
      return `${price} ETB • ${t("gameCard.reserveSpot")}`;
    }

    if (paymentDetails.payment_method === "venue") {
      return `${price} ETB • ${t("gameCard.reserveSpot")}`;
    }

    return t("gameCard.joinGame");
  }

  const actionDisabled =
    joining ||
    isConfirmed ||
    isWaitlisted ||
    (isPendingPayment && isPaymentSubmitted) ||
    (isPendingPayment && offerExpiredLocally);

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextWrap}>
            <Text style={styles.title}>{game.title}</Text>

            <Text style={styles.organizer}>
              {t("gameCard.by")} {game.organizer}
            </Text>
          </View>

          <Pressable style={styles.favorite} hitSlop={8}>
            <Ionicons name="heart-outline" size={23} color="#222222" />
          </Pressable>
        </View>

        <Pressable style={styles.locationRow} onPress={openGameLocation}>
          <Ionicons name="location-outline" size={16} color="#717171" />

          <Text style={styles.locationText}>
            {game.area}
            {locationGame.city &&
            !String(game.area)
              .toLowerCase()
              .includes(locationGame.city.toLowerCase())
              ? `, ${locationGame.city}`
              : ""}
            {game.distance ? ` · ${game.distance}` : ""}
          </Text>
        </Pressable>

        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color="#717171" />
          <Text style={styles.timeText}>{game.time}</Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailText}>{game.format}</Text>
          <Text style={styles.detailDot}>·</Text>
          <Text style={styles.detailText}>{getSkillLabel(game.skill)}</Text>
          <Text style={styles.detailDot}>·</Text>
          <Text style={isFull ? styles.fullText : styles.detailText}>
            {isFull
              ? t("gameCard.gameFull")
              : `${spotsLeft} ${t("gameCard.spotsLeft")}`}
          </Text>
        </View>

        <View style={styles.priceActionRow}>
          <Text style={styles.price}>
            {price === 0 ? t("gameCard.free") : `${price} ETB`}
          </Text>

          {!isPaymentSubmitted && !offerExpiredLocally && !isConfirmed && !isWaitlisted && (
            <Pressable
              style={[
                styles.compactAction,
                isFull && !bookingStatus && styles.compactActionOutline,
                isPendingPayment && styles.compactActionPending,
                joining && styles.disabledButton,
              ]}
              onPress={handleJoinGame}
              disabled={actionDisabled}
            >
              <Text
                style={[
                  styles.compactActionText,
                  isFull && !bookingStatus && styles.compactActionOutlineText,
                  isPendingPayment && styles.compactActionPendingText,
                ]}
              >
                {joining
                  ? getButtonText()
                  : isFull
                    ? t("gameCard.joinWaitlist")
                    : isPendingPayment
                      ? getButtonText()
                      : isPaidGame
                        ? t("gameCard.reserveSpot")
                        : t("gameCard.joinGame")}
              </Text>

              {!joining && (
                <Ionicons
                  name={isFull ? "arrow-forward" : "arrow-forward"}
                  size={17}
                  color={
                    isPendingPayment
                      ? "#7A5200"
                      : "#087EA4"
                  }
                />
              )}
            </Pressable>
          )}
        </View>

        {isWaitlisted && isPaidGame && (
          <View style={styles.notice}>
            <Ionicons name="time-outline" size={19} color="#9A6700" />

            <Text style={styles.noticeText}>
              {t("gameCard.paidWaitlistMessage")}
            </Text>
          </View>
        )}

        {isPendingPayment &&
          !isPaymentSubmitted &&
          paymentOfferExpiresAt &&
          !offerExpiredLocally &&
          offerSecondsLeft !== null && (
            <View style={styles.offerCountdown}>
              <Ionicons name="timer-outline" size={19} color="#9A6700" />

              <View style={styles.offerCountdownTextWrap}>
                <Text style={styles.offerCountdownTitle}>
                  Pay within {formatOfferCountdown(offerSecondsLeft)}
                </Text>

                <Text style={styles.offerCountdownText}>
                  Complete payment before the timer ends to keep this spot.
                </Text>
              </View>
            </View>
          )}

        {paymentMessage && (
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


      </View>

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
              {game.title} • {price} ETB
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
                      .replace("{price}", String(price))
                      .replace(
                        "{time}",
                        formatOfferCountdown(offerSecondsLeft) ?? "00:00",
                      )
                  : t("gameCard.sendPaymentPending").replace(
                      "{price}",
                      String(price),
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
    overflow: "hidden",
  },

  content: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  titleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: "#222222",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.25,
    lineHeight: 25,
  },

  organizer: {
    color: "#717171",
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },

  favorite: {
    width: 38,
    height: 38,
    marginTop: -7,
    marginRight: -6,
    alignItems: "center",
    justifyContent: "center",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 11,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },

  locationText: {
    color: "#717171",
    fontSize: 14,
    fontWeight: "400",
    flexShrink: 1,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
  },

  timeText: {
    color: "#3F3F3F",
    fontSize: 14,
    fontWeight: "600",
  },

  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
  },

  detailText: {
    color: "#4A4A4A",
    fontSize: 14,
    fontWeight: "500",
  },

  detailDot: {
    color: "#B0B0B0",
    fontSize: 14,
    marginHorizontal: 6,
  },

  fullText: {
    color: "#C13515",
    fontSize: 14,
    fontWeight: "600",
  },

  priceActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 17,
  },

  price: {
    color: "#222222",
    fontSize: 17,
    fontWeight: "700",
  },

  compactAction: {
    minHeight: 36,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  compactActionText: {
    color: "#087EA4",
    fontSize: 15,
    fontWeight: "700",
  },

  compactActionOutline: {
    backgroundColor: "transparent",
  },

  compactActionOutlineText: {
    color: "#087EA4",
  },

  compactActionPending: {
    backgroundColor: "transparent",
  },

  compactActionPendingText: {
    color: "#9A6700",
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#F2D38B",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  noticeText: {
    color: "#7A5200",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    flex: 1,
  },









  offerCountdown: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#F2D38B",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
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
    borderWidth: 1,
    borderColor: "#F2D38B",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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