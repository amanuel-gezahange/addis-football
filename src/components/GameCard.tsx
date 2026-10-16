import { Ionicons } from "@expo/vector-icons";

import { useEffect, useState } from "react";

import {
  Clipboard,
  Image,
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
      <View style={styles.imageContainer}>
        <Image
          source={
            typeof game.image === "string" ? { uri: game.image } : game.image
          }

          style={styles.image}

          resizeMode="cover"
        />

        <View
          style={[
            styles.statusBadge,

            isFull ? styles.fullBadge : styles.confirmedBadge,
          ]}
        >
          <Ionicons
            name={isFull ? "alert-circle" : "checkmark-circle"}

            size={17}

            color={isFull ? "#FFFFFF" : "#71E49A"}
          />

          <Text style={[styles.statusText, isFull && styles.fullStatusText]}>
            {isFull ? t("gameCard.gameFull") : t("gameCard.available")}
          </Text>
        </View>

        <Pressable style={styles.favorite}>
          <Ionicons name="heart-outline" size={30} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{game.title}</Text>

        <Text style={styles.organizer}>
          {t("gameCard.by")} {game.organizer}
        </Text>

        <View style={styles.locationRow}>
          <Pressable style={styles.locationLink} onPress={openGameLocation}>
            <Ionicons
              name="location-outline"
              size={17}
              color={c.textSecondary}
            />
            <Text style={styles.locationText}>
              {game.area}
              {locationGame.city &&
              !String(game.area)
                .toLowerCase()
                .includes(locationGame.city.toLowerCase())
                ? `, ${locationGame.city}`
                : ""}
            </Text>
          </Pressable>

          {game.distance ? (
            <Text style={styles.distanceText}> • {game.distance}</Text>
          ) : null}
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.skillBadge}>
            <Text style={styles.skillText}>{getSkillLabel(game.skill)}</Text>
          </View>

          <Text style={isFull ? styles.fullText : styles.spotsText}>
            {isFull
              ? t("gameCard.gameFull")
              : `${spotsLeft} ${t("gameCard.spotsLeft")}`}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.timeRow}>
            <Ionicons name="calendar-outline" size={19} color="#D7E1DC" />

            <Text style={styles.time}>
              {game.time} • {game.format}
            </Text>
          </View>

          <Text style={styles.price}>
            {price === 0 ? t("gameCard.free") : `${price} ETB`}
          </Text>
        </View>

        {isWaitlisted && isPaidGame && (
          <View style={styles.notice}>
            <Ionicons name="time-outline" size={19} color="#F6C85F" />

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
              <Ionicons name="timer-outline" size={19} color="#F6C85F" />

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

              color={isConfirmed ? "#71E49A" : "#F6C85F"}
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

        {!isPaymentSubmitted && !offerExpiredLocally && (
          <Pressable
            style={[
              styles.actionButton,

              isFull && !bookingStatus && styles.waitlistButton,

              isConfirmed && styles.joinedButton,

              isWaitlisted && styles.waitlistedButton,

              isPendingPayment && styles.pendingButton,

              isPendingPayment && !isPaymentSubmitted && styles.paidButton,

              joining && styles.disabledButton,
            ]}

            onPress={handleJoinGame}

            disabled={actionDisabled}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name={
                  isConfirmed
                    ? "checkmark-circle"
                    : isWaitlisted
                      ? "time-outline"
                      : isPendingPayment
                        ? "checkmark-outline"
                        : isFull
                          ? "list-outline"
                          : "football-outline"
                }

                size={20}

                color={
                  isConfirmed
                    ? "#71E49A"
                    : isWaitlisted
                      ? "#F6C85F"
                      : c.primaryText
                }
              />

              <Text
                style={[
                  styles.actionText,

                  isConfirmed && styles.joinedText,

                  isWaitlisted && styles.pendingText,

                  isFull && !bookingStatus && styles.waitlistText,
                ]}
              >
                {getButtonText()}
              </Text>
            </View>
          </Pressable>
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
    backgroundColor: c.surface,

    borderRadius: 24,

    borderWidth: 1,

    borderColor: c.border,

    overflow: "hidden",

    marginBottom: 20,
  },

  imageContainer: {
    height: 70,

    position: "relative",
  },

  image: {
    width: "100%",

    height: "100%",
  },

  statusBadge: {
    position: "absolute",

    top: 16,

    left: 16,

    borderRadius: 18,

    paddingVertical: 7,

    paddingHorizontal: 11,

    flexDirection: "row",

    alignItems: "center",

    gap: 5,
  },

  confirmedBadge: {
    backgroundColor: c.successDark,
  },

  fullBadge: {
    backgroundColor: c.dangerDark,
  },

  statusText: {
    color: "#71E49A",

    fontSize: 15,

    fontWeight: "700",
  },

  fullStatusText: {
    color: "#FFFFFF",
  },

  favorite: {
    position: "absolute",

    right: 15,

    top: 13,

    width: 44,

    height: 44,

    alignItems: "center",

    justifyContent: "center",
  },

  content: {
    padding: 18,
  },

  title: {
    color: c.text,

    fontSize: 22,

    fontWeight: "800",
  },

  organizer: {
    color: c.textSecondary,

    fontSize: 16,

    marginTop: 3,
  },

  locationRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    marginTop: 9,
  },

  locationLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  distanceText: {
    color: c.textSecondary,
    fontSize: 15,
  },

  locationText: {
    color: c.textSecondary,

    fontSize: 15,
  },

  detailsRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginTop: 21,
  },

  skillBadge: {
    backgroundColor: c.skill,

    borderRadius: 16,

    paddingHorizontal: 13,

    paddingVertical: 7,
  },

  skillText: {
    color: c.skillText,

    fontWeight: "700",

    fontSize: 14,
  },

  spotsText: {
    color: c.success,

    fontSize: 16,

    fontWeight: "700",
  },

  fullText: {
    color: c.danger,

    fontSize: 16,

    fontWeight: "700",
  },

  bottomRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginTop: 16,

    marginBottom: 18,
  },

  timeRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 7,

    flexShrink: 1,
  },

  time: {
    color: "#D7E1DC",

    fontSize: 15,
  },

  price: {
    color: c.text,

    fontSize: 20,

    fontWeight: "800",

    marginLeft: 8,
  },

  notice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 12,

    paddingHorizontal: 12,

    paddingVertical: 10,

    marginBottom: 12,
  },

  noticeText: {
    color: "#F6C85F",

    fontSize: 14,

    fontWeight: "600",

    lineHeight: 19,

    flex: 1,
  },

  paymentCard: {
    backgroundColor: "#102B22",

    borderWidth: 1,

    borderColor: "#18C8FF",

    borderRadius: 15,

    padding: 14,

    marginBottom: 12,
  },

  paymentTitleRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    marginBottom: 10,
  },

  paymentTitle: {
    color: "#FFFFFF",

    fontSize: 17,

    fontWeight: "800",
  },

  amountText: {
    color: "#71E49A",

    fontSize: 26,

    fontWeight: "900",

    marginBottom: 12,
  },

  paymentDetailRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    gap: 12,

    paddingVertical: 5,
  },

  detailLabel: {
    color: "#9FAAA5",

    fontSize: 14,
  },

  detailValue: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "700",

    textAlign: "right",

    flexShrink: 1,
  },

  paymentDescription: {
    color: "#D7E1DC",

    fontSize: 14,

    lineHeight: 20,

    marginTop: 11,
  },

  offerCountdown: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 9,

    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 12,

    paddingHorizontal: 12,

    paddingVertical: 11,

    marginBottom: 12,
  },

  offerCountdownTextWrap: { flex: 1 },

  offerCountdownTitle: { color: "#F6C85F", fontSize: 15, fontWeight: "800" },

  offerCountdownText: {
    color: "#D8C98E",

    fontSize: 13,

    lineHeight: 18,

    marginTop: 2,
  },

  message: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 12,

    paddingHorizontal: 12,

    paddingVertical: 10,

    marginBottom: 12,
  },

  messageText: {
    color: "#F6C85F",

    fontSize: 14,

    fontWeight: "600",

    flex: 1,
  },

  successMessageText: {
    color: "#71E49A",
  },

  actionButton: {
    height: 56,

    backgroundColor: c.primary,

    borderRadius: 15,

    alignItems: "center",

    justifyContent: "center",
  },

  actionText: {
    color: c.primaryText,

    fontSize: 17,

    fontWeight: "800",
  },

  buttonContent: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  waitlistButton: {
    backgroundColor: "transparent",

    borderWidth: 1,

    borderColor: c.primary,
  },

  waitlistText: {
    color: c.primary,
  },

  joinedButton: {
    backgroundColor: "#0B1726",

    borderWidth: 1,

    borderColor: "#18C8FF",
  },

  joinedText: {
    color: "#71E49A",
  },

  waitlistedButton: {
    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#F6C85F",
  },

  pendingButton: {
    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#F6C85F",
  },

  paidButton: {
    backgroundColor: c.primary,

    borderWidth: 0,
  },

  pendingText: {
    color: "#F6C85F",
  },

  disabledButton: {
    opacity: 0.65,
  },

  modalBackdrop: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.66)",

    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#101D2B",

    borderTopLeftRadius: 24,

    borderTopRightRadius: 24,

    borderWidth: 1,

    borderColor: "#263B4E",

    paddingHorizontal: 20,

    paddingTop: 10,

    paddingBottom: 14,
  },

  modalHandle: {
    width: 38,

    height: 4,

    borderRadius: 2,

    backgroundColor: "#526474",

    alignSelf: "center",

    marginBottom: 17,
  },

  modalTitle: {
    color: "#FFFFFF",

    fontSize: 22,

    fontWeight: "800",

    textAlign: "center",
  },

  modalSubtitle: {
    color: "#9FAEB9",

    fontSize: 14,

    fontWeight: "600",

    textAlign: "center",

    marginTop: 5,

    marginBottom: 18,
  },

  accountCard: {
    backgroundColor: "#0B1726",

    borderWidth: 1,

    borderColor: "#294154",

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

    backgroundColor: "#102A3A",

    alignItems: "center",

    justifyContent: "center",
  },

  providerName: {
    color: "#FFFFFF",

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
    color: "#FFFFFF",

    fontSize: 22,

    fontWeight: "900",

    letterSpacing: 0.3,

    flexShrink: 1,
  },

  copyButton: {
    minHeight: 38,

    paddingHorizontal: 12,

    borderRadius: 10,

    backgroundColor: "#102A3A",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,
  },

  copyText: {
    color: "#18C8FF",

    fontSize: 14,

    fontWeight: "800",
  },

  accountName: {
    color: "#AEBBC5",

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
    color: "#B8C4CD",

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
    color: c.primaryText,

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
    color: "#AEBBC5",

    fontSize: 15,

    fontWeight: "700",
  },
});
