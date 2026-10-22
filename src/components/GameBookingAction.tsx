import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type BookingStatus =
  | "confirmed"
  | "waitlisted"
  | "pending_payment"
  | null;

type PaymentMethod = "free" | "venue" | "organizer";

type PaymentDetails = {
  payment_method: PaymentMethod;
  payment_provider: string | null;
  payment_phone: string | null;
  payment_account_name: string | null;
  accepts_telebirr: boolean;
  accepts_mobile_banking: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
};

type SelectedPaymentMethod = "telebirr" | "mobile_banking" | null;

export type GameBookingState = {
  bookingStatus:
    | "confirmed"
    | "waitlisted"
    | "pending_payment"
    | null;
  paymentStatus: string | null;
  paymentMethod: "free" | "venue" | "organizer";
  paymentProvider: string | null;
};

type Props = {
  gameId: string | number;
  title: string;
  price: number;
  spotsLeft: number;
  status: string | null;

  paymentMethod: PaymentMethod;
  paymentProvider: string | null;
  paymentPhone: string | null;
  paymentAccountName: string | null;
  acceptsTelebirr?: boolean;
  acceptsMobileBanking?: boolean;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;

  onSpotsChange?: (spotsLeft: number) => void;
  onBookingStateChange?: (state: GameBookingState) => void;
  onDirectionsPress?: () => void;
};

export default function GameBookingAction({
  gameId,
  title,
  price,
  spotsLeft: initialSpotsLeft,
  status,

  paymentMethod,
  paymentProvider,
  paymentPhone,
  paymentAccountName,
  acceptsTelebirr = Boolean(paymentPhone),
  acceptsMobileBanking = false,
  bankName = null,
  bankAccountNumber = null,
  bankAccountName = null,

  onSpotsChange,
  onBookingStateChange,
  onDirectionsPress,
}: Props) {
  const { t } = useLanguage();

  const [bookingStatus, setBookingStatus] =
    useState<BookingStatus>(null);

  const [bookingId, setBookingId] = useState<number | null>(
    null,
  );

  const [paymentStatus, setPaymentStatus] = useState<
    string | null
  >(null);

  const [
    paymentOfferExpiresAt,
    setPaymentOfferExpiresAt,
  ] = useState<string | null>(null);

  const [offerSecondsLeft, setOfferSecondsLeft] = useState<
    number | null
  >(null);

  const [offerExpiredLocally, setOfferExpiredLocally] =
    useState(false);

  const [joining, setJoining] = useState(false);

  const [successModalVisible, setSuccessModalVisible] =
    useState(false);

  const [
    waitlistModalVisible,
    setWaitlistModalVisible,
  ] = useState(false);

  const [stateLoading, setStateLoading] = useState(true);

  const [paymentModalVisible, setPaymentModalVisible] =
    useState(false);

  const [paymentNumberCopied, setPaymentNumberCopied] =
    useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<SelectedPaymentMethod>(null);

  const [
    paymentSubmittedModalVisible,
    setPaymentSubmittedModalVisible,
  ] = useState(false);

  const [paymentMessage, setPaymentMessage] = useState<
    string | null
  >(null);

  const [spotsLeft, setSpotsLeft] = useState(
    Number(initialSpotsLeft ?? 0),
  );

  const [paymentDetails, setPaymentDetails] =
    useState<PaymentDetails>({
      payment_method: paymentMethod,
      payment_provider: paymentProvider,
      payment_phone: paymentPhone,
      payment_account_name: paymentAccountName,
      accepts_telebirr: acceptsTelebirr,
      accepts_mobile_banking: acceptsMobileBanking,
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_name: bankAccountName,
    });

  const numericPrice = Number(price ?? 0);

  const isPaidGame = numericPrice > 0;

  const isFull = status === "full" || spotsLeft <= 0;

  const isCancelled = status === "cancelled";

  const isConfirmed = bookingStatus === "confirmed";

  const isWaitlisted = bookingStatus === "waitlisted";

  const isPendingPayment =
    bookingStatus === "pending_payment";

  const isPaymentSubmitted =
    paymentStatus === "submitted";

  const isOrganizerPayment =
    paymentDetails.payment_method === "organizer";

  useEffect(() => {
    setSpotsLeft(Number(initialSpotsLeft ?? 0));
  }, [initialSpotsLeft]);

  useEffect(() => {
    setPaymentDetails({
      payment_method: paymentMethod,
      payment_provider: paymentProvider,
      payment_phone: paymentPhone,
      payment_account_name: paymentAccountName,
      accepts_telebirr: acceptsTelebirr,
      accepts_mobile_banking: acceptsMobileBanking,
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_name: bankAccountName,
    });
  }, [
    paymentMethod,
    paymentProvider,
    paymentPhone,
    paymentAccountName,
    acceptsTelebirr,
    acceptsMobileBanking,
    bankName,
    bankAccountNumber,
    bankAccountName,
  ]);

  useEffect(() => {
    if (stateLoading) {
      return;
    }

    onBookingStateChange?.({
      bookingStatus,
      paymentStatus,
      paymentMethod: paymentDetails.payment_method,
      paymentProvider: paymentDetails.payment_provider,
    });
  }, [
    stateLoading,
    bookingStatus,
    paymentStatus,
    paymentDetails.payment_method,
    paymentDetails.payment_provider,
    onBookingStateChange,
  ]);

  function updateSpots(nextSpotsLeft: number) {
    setSpotsLeft(nextSpotsLeft);
    onSpotsChange?.(nextSpotsLeft);
  }

  async function loadState() {
    setStateLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;

    if (!userId) {
      setBookingStatus(null);
      setBookingId(null);
      setPaymentStatus(null);
      setPaymentOfferExpiresAt(null);
      setOfferSecondsLeft(null);
      setOfferExpiredLocally(false);
      setStateLoading(false);
      return;
    }

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .select(
          `
            id,
            status,
            payment_status,
            payment_offer_expires_at
          `,
        )
        .eq("user_id", userId)
        .eq("game_id", Number(gameId))
        .in("status", [
          "confirmed",
          "waitlisted",
          "pending_payment",
        ])
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (bookingError) {
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

    const offerExpiry =
      booking.payment_offer_expires_at ?? null;

    setPaymentOfferExpiresAt(offerExpiry);

    if (
      offerExpiry &&
      booking.status === "pending_payment" &&
      booking.payment_status === "pending"
    ) {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(offerExpiry).getTime() - Date.now()) /
            1000,
        ),
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

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [gameId, numericPrice]),
  );

  useEffect(() => {
    if (
      !paymentOfferExpiresAt ||
      !isPendingPayment ||
      isPaymentSubmitted
    ) {
      setOfferSecondsLeft(null);
      return;
    }

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (new Date(
            paymentOfferExpiresAt,
          ).getTime() -
            Date.now()) /
            1000,
        ),
      );

      setOfferSecondsLeft(seconds);

      if (seconds <= 0) {
        setOfferExpiredLocally(true);

        setPaymentModalVisible(false);

        setPaymentMessage(
          t("gameCard.paymentTimeExpired"),
        );
      }
    };

    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [
    paymentOfferExpiresAt,
    isPendingPayment,
    isPaymentSubmitted,
  ]);

  useEffect(() => {
    if (!offerExpiredLocally) {
      return;
    }

    const refreshExpiredOffer = setInterval(
      () => loadState(),
      2000,
    );

    return () => clearInterval(refreshExpiredOffer);
  }, [offerExpiredLocally, gameId]);

  function formatOfferCountdown(
    totalSeconds: number | null,
  ) {
    if (totalSeconds === null) {
      return null;
    }

    const safeSeconds = Math.max(0, totalSeconds);

    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  async function handleJoinGame() {
    if (joining || isCancelled) return;

    setPaymentMessage(null);

    if (isConfirmed || isWaitlisted) {
      return;
    }

    if (isPendingPayment) {
      if (offerExpiredLocally) {
        setPaymentModalVisible(false);

        setPaymentMessage(
          t("gameCard.paymentTimeExpired"),
        );

        await loadState();

        return;
      }

      if (isPaymentSubmitted) {
        setPaymentMessage(null);
        return;
      }

      if (isOrganizerPayment) {
        openOrganizerPayment();
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
      handleOrganizerReservation();
      return;
    }

    setPaymentMessage(
      t("gameCard.paymentMethodNotAvailable"),
    );
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

      const { data, error } = await supabase.rpc(
        "join_game",
        {
          p_game_id: Number(gameId),
        },
      );

      if (error) {
        if (
          error.message
            .toLowerCase()
            .includes("already joined")
        ) {
          setPaymentMessage(null);
          await loadState();
          return;
        }

        setPaymentMessage(
          t("gameCard.bookingCouldNotBeCreated"),
        );

        return;
      }

      if (data?.booking_id) {
        setBookingId(Number(data.booking_id));
      }

      if (data?.booking_status === "confirmed") {
        setBookingStatus("confirmed");
        setSuccessModalVisible(true);
      } else if (
        data?.booking_status === "waitlisted"
      ) {
        setBookingStatus("waitlisted");
        setWaitlistModalVisible(true);
      } else if (
        data?.booking_status === "pending_payment"
      ) {
        setBookingStatus("pending_payment");
      }

      if (typeof data?.spots_left === "number") {
        updateSpots(Number(data.spots_left));
      }
    } finally {
      setJoining(false);
    }
  }

  function openOrganizerPayment() {
    setPaymentMessage(null);
    setPaymentNumberCopied(false);

    if (
      paymentDetails.accepts_telebirr &&
      paymentDetails.accepts_mobile_banking
    ) {
      setSelectedPaymentMethod(null);
    } else if (paymentDetails.accepts_mobile_banking) {
      setSelectedPaymentMethod("mobile_banking");
    } else {
      setSelectedPaymentMethod("telebirr");
    }

    setPaymentModalVisible(true);
  }

  function handleOrganizerReservation() {
    openOrganizerPayment();
  }

  function handleCopyPaymentNumber() {
    const value =
      selectedPaymentMethod === "mobile_banking"
        ? paymentDetails.bank_account_number
        : paymentDetails.payment_phone;

    if (!value) return;

    Clipboard.setString(value);
    setPaymentNumberCopied(true);
  }

  function selectOrganizerPaymentMethod(
    method: Exclude<SelectedPaymentMethod, null>,
  ) {
    setPaymentNumberCopied(false);
    setSelectedPaymentMethod(method);
  }

  async function handleSubmitPayment() {
    if (joining) return;

    setJoining(true);
    setPaymentMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setPaymentMessage(t("gameCard.signInFirst"));
        return;
      }

      const { data, error } = await supabase.rpc(
        "submit_new_organizer_payment",
        {
          p_game_id: Number(gameId),
          p_player_reference: null,
        },
      );

      if (error) {
        const message = error.message.toLowerCase();

        if (message.includes("game is full")) {
          setPaymentModalVisible(false);

          setPaymentMessage(
            t("gameCard.bookingCouldNotBeCreated"),
          );

          await loadState();

          return;
        }

        if (
          message.includes(
            "already have an active booking",
          )
        ) {
          setPaymentModalVisible(false);
          await loadState();
          return;
        }

        setPaymentMessage(
          t("gameCard.couldNotSubmitPayment"),
        );

        return;
      }

      if (data?.success) {
        if (data?.booking_id) {
          setBookingId(Number(data.booking_id));
        }

        setBookingStatus("pending_payment");
        setPaymentStatus("submitted");

        if (typeof data?.spots_left === "number") {
          updateSpots(Number(data.spots_left));
        }

        setPaymentOfferExpiresAt(null);
        setOfferSecondsLeft(null);
        setOfferExpiredLocally(false);

        setPaymentMessage(null);

        setPaymentModalVisible(false);

        setPaymentSubmittedModalVisible(true);
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

  const useStackedFooter =
    isPendingPayment && isPaymentSubmitted;

  const actionDisabled =
    stateLoading ||
    joining ||
    isCancelled ||
    isConfirmed ||
    isWaitlisted ||
    (isPendingPayment && isPaymentSubmitted) ||
    (isPendingPayment && offerExpiredLocally);

  return (
    <>
      {isCancelled ? (
        <View style={styles.cancelledFooter}>
          <View style={styles.cancelledIcon}>
            <Ionicons
              name="close"
              size={18}
              color="#B42318"
            />
          </View>

          <View style={styles.cancelledContent}>
            <Text style={styles.cancelledTitle}>
              {t("bookingAction.gameCancelled")}
            </Text>

            <Text style={styles.cancelledText}>
              {t(
                "bookingAction.gameCancelledDescription",
              )}
            </Text>
          </View>
        </View>
      ) : isConfirmed ? (
        <View style={styles.confirmedFooter}>
          <Pressable
            style={({ pressed }) => [
              styles.directionsButton,
              pressed &&
                styles.directionsButtonPressed,
            ]}
            onPress={onDirectionsPress}
            disabled={!onDirectionsPress}
            accessibilityRole="button"
          >
            <Ionicons
              name="navigate"
              size={20}
              color="#07111F"
            />

            <Text style={styles.directionsButtonText}>
              {t("gameDetails.directionsToField")}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#07111F"
            />
          </Pressable>
        </View>
      ) : isPendingPayment &&
        isPaymentSubmitted ? null : (
        <View
          style={[
            styles.wrapper,
            useStackedFooter &&
              styles.wrapperStacked,
          ]}
        >
          <View
            style={[
              styles.footerInfo,
              useStackedFooter &&
                styles.footerInfoStacked,
            ]}
          >
            <Text style={styles.price}>
              {numericPrice === 0
                ? t("gameCard.free")
                : `${numericPrice} ETB`}
            </Text>

            <Text
              style={[
                styles.spots,
                isFull && styles.spotsFull,
              ]}
            >
              {isFull
                ? t("gameCard.gameFull")
                : `${spotsLeft} ${t(
                    "gameCard.spotsLeft",
                  )}`}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,

              useStackedFooter &&
                styles.actionButtonStacked,

              isFull &&
                !bookingStatus &&
                styles.waitlistButton,

              isWaitlisted &&
                styles.waitlistedButton,

              useStackedFooter &&
                styles.waitingForOrganizerButton,

              pressed &&
                !actionDisabled &&
                styles.actionButtonPressed,
            ]}
            onPress={handleJoinGame}
            disabled={actionDisabled}
          >
            {useStackedFooter && (
              <Ionicons
                name="checkmark-circle"
                size={19}
                color="#149447"
              />
            )}

            {joining ? (
              <ActivityIndicator
                size="small"
                color={
                  isFull && !bookingStatus
                    ? "#087EA4"
                    : "#07111F"
                }
              />
            ) : (
              <Text
                style={[
                  styles.actionButtonText,

                  isFull &&
                    !bookingStatus &&
                    styles.waitlistButtonText,

                  isWaitlisted &&
                    styles.waitlistedButtonText,

                  useStackedFooter &&
                    styles.waitingForOrganizerButtonText,
                ]}
              >
                {getButtonText()}
              </Text>
            )}

            {joining && (
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color="#07111F"
              />
            )}
          </Pressable>
        </View>
      )}

      {isPendingPayment &&
        !isPaymentSubmitted &&
        paymentOfferExpiresAt &&
        !offerExpiredLocally &&
        offerSecondsLeft !== null && (
          <View style={styles.offerCountdown}>
            <Ionicons
              name="timer-outline"
              size={19}
              color="#9A6700"
            />

            <View
              style={styles.offerCountdownTextWrap}
            >
              <Text
                style={styles.offerCountdownTitle}
              >
                {t("gameCard.payWithin").replace(
                  "{time}",
                  formatOfferCountdown(
                    offerSecondsLeft,
                  ) ?? "00:00",
                )}
              </Text>

              <Text
                style={styles.offerCountdownText}
              >
                {t(
                  "gameCard.completePaymentBeforeTimer",
                )}
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
            color={
              isConfirmed ? "#008A3B" : "#9A6700"
            }
          />

          <Text
            style={[
              styles.messageText,
              isConfirmed &&
                styles.successMessageText,
            ]}
          >
            {paymentMessage}
          </Text>
        </View>
      )}

      {/* SUCCESS MODAL */}

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSuccessModalVisible(false)
        }
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <Pressable
              style={styles.successCloseButton}
              onPress={() =>
                setSuccessModalVisible(false)
              }
              accessibilityRole="button"
            >
              <Ionicons
                name="close"
                size={22}
                color="#8FA1AF"
              />
            </Pressable>

            <View style={styles.successIcon}>
              <Ionicons
                name="checkmark"
                size={42}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.successTitle}>
              {t("bookingSuccess.youreIn")}
            </Text>

            <Text style={styles.successGameTitle}>
              {title}
            </Text>

            <View style={styles.successSummary}>
              <View style={styles.successSummaryRow}>
                <View
                  style={styles.successSummaryIcon}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={21}
                    color="#149447"
                  />
                </View>

                <View
                  style={
                    styles.successSummaryTextWrap
                  }
                >
                  <Text
                    style={
                      styles.successSummaryTitle
                    }
                  >
                    {t(
                      "bookingSuccess.bookingConfirmed",
                    )}
                  </Text>

                  <Text
                    style={
                      styles.successSummaryText
                    }
                  >
                    {spotsLeft}{" "}
                    {t("gameCard.spotsLeft")}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.successDoneButton,
                pressed &&
                  styles.actionButtonPressed,
              ]}
              onPress={() => {
                setSuccessModalVisible(false);
                router.push("/bookings");
              }}
            >
              <Text
                style={styles.successDoneButtonText}
              >
                {t(
                  "bookingSuccess.viewMyBookings",
                )}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* WAITLIST MODAL */}

      <Modal
        visible={waitlistModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setWaitlistModalVisible(false)
        }
      >
        <View style={styles.waitlistModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setWaitlistModalVisible(false)
            }
          />

          <View style={styles.waitlistModalSheet}>
            <View style={styles.waitlistModalHandle} />

            <View style={styles.waitlistModalIcon}>
              <Ionicons
                name="time-outline"
                size={32}
                color="#18C8FF"
              />
            </View>

            <Text style={styles.waitlistModalTitle}>
              {t("gameCard.waitlistSuccessTitle")}
            </Text>

            <Text
              style={styles.waitlistModalSubtitle}
            >
              {t(
                "gameCard.waitlistSuccessSubtitle",
              )}
            </Text>

            <View style={styles.waitlistGameCard}>
              <Ionicons
                name="football-outline"
                size={22}
                color="#18C8FF"
              />

              <Text
                style={styles.waitlistGameTitle}
                numberOfLines={2}
              >
                {title}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.waitlistGotItButton,
                pressed &&
                  styles.actionButtonPressed,
              ]}
              onPress={() =>
                setWaitlistModalVisible(false)
              }
            >
              <Text
                style={
                  styles.waitlistGotItButtonText
                }
              >
                {t("gameCard.gotIt")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* PAY ORGANIZER MODAL */}

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setPaymentModalVisible(false)}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color="#667085" />
            </Pressable>

            {selectedPaymentMethod === null ? (
              <>
                <Text style={styles.paymentFlowTitle}>Choose how to pay</Text>

                <Text style={styles.paymentChoiceSubtitle}>
                  {numericPrice} ETB
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.paymentChoiceCard,
                    pressed && styles.copyPaymentButtonPressed,
                  ]}
                  onPress={() => selectOrganizerPaymentMethod("telebirr")}
                >
                  <View style={styles.paymentChoiceIcon}>
                    <Ionicons name="phone-portrait-outline" size={22} color="#087EA4" />
                  </View>
                  <View style={styles.paymentChoiceText}>
                    <Text style={styles.paymentChoiceTitle}>Telebirr</Text>
                    <Text style={styles.paymentChoiceDescription}>
                      Pay using the organizer's Telebirr number
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.paymentChoiceCard,
                    pressed && styles.copyPaymentButtonPressed,
                  ]}
                  onPress={() =>
                    selectOrganizerPaymentMethod("mobile_banking")
                  }
                >
                  <View style={styles.paymentChoiceIcon}>
                    <Ionicons name="card-outline" size={22} color="#087EA4" />
                  </View>
                  <View style={styles.paymentChoiceText}>
                    <Text style={styles.paymentChoiceTitle}>Mobile Banking</Text>
                    <Text style={styles.paymentChoiceDescription}>
                      Transfer to the organizer's bank account
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#98A2B3" />
                </Pressable>
              </>
            ) : (
              <>
                {paymentDetails.accepts_telebirr &&
                  paymentDetails.accepts_mobile_banking && (
                    <Pressable
                      onPress={() => {
                        setPaymentNumberCopied(false);
                        setSelectedPaymentMethod(null);
                      }}
                      style={styles.changePaymentMethodButton}
                    >
                      <Ionicons name="chevron-back" size={18} color="#087EA4" />
                      <Text style={styles.changePaymentMethodText}>
                        Change payment method
                      </Text>
                    </Pressable>
                  )}

                <Text style={styles.paymentFlowTitle}>
                  {selectedPaymentMethod === "mobile_banking"
                    ? "Pay with mobile banking"
                    : "Pay with Telebirr"}
                </Text>

                <Text style={styles.paymentFlowAmount}>
                  {numericPrice} ETB
                </Text>

                {selectedPaymentMethod === "mobile_banking" && (
                  <Text style={styles.paymentBankName}>
                    {paymentDetails.bank_name ?? "Bank"}
                  </Text>
                )}

                <Text style={styles.paymentFlowRecipient}>
                  {selectedPaymentMethod === "mobile_banking"
                    ? paymentDetails.bank_account_name ??
                      t("gameCard.accountNameNotProvided")
                    : paymentDetails.payment_account_name ??
                      t("gameCard.accountNameNotProvided")}
                  {(selectedPaymentMethod === "mobile_banking"
                    ? paymentDetails.bank_account_number
                    : paymentDetails.payment_phone)
                    ? ` · ${
                        selectedPaymentMethod === "mobile_banking"
                          ? paymentDetails.bank_account_number
                          : paymentDetails.payment_phone
                      }`
                    : ""}
                </Text>

                {(selectedPaymentMethod === "mobile_banking"
                  ? paymentDetails.bank_account_number
                  : paymentDetails.payment_phone) ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.paymentFlowCopyButton,
                      paymentNumberCopied &&
                        styles.paymentFlowCopyButtonCopied,
                      pressed && styles.copyPaymentButtonPressed,
                    ]}
                    onPress={handleCopyPaymentNumber}
                  >
                    <Ionicons
                      name={
                        paymentNumberCopied
                          ? "checkmark-circle"
                          : "copy-outline"
                      }
                      size={20}
                      color={paymentNumberCopied ? "#149447" : "#087EA4"}
                    />
                    <Text
                      style={[
                        styles.paymentFlowCopyText,
                        paymentNumberCopied &&
                          styles.paymentFlowCopyTextCopied,
                      ]}
                    >
                      {paymentNumberCopied
                        ? selectedPaymentMethod === "mobile_banking"
                          ? "Account number copied"
                          : "Number copied"
                        : selectedPaymentMethod === "mobile_banking"
                          ? "Copy account number"
                          : "Copy number"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.simpleMissingNumber}>
                    {t("gameCard.notProvided")}
                  </Text>
                )}

                <View style={styles.paymentSteps}>
                  <View style={styles.paymentStepRow}>
                    <View style={styles.paymentStepNumber}>
                      <Text style={styles.paymentStepNumberText}>1</Text>
                    </View>
                    <Text style={styles.paymentStepText}>
                      {selectedPaymentMethod === "mobile_banking"
                        ? "Copy the account number"
                        : "Copy the number"}
                    </Text>
                  </View>

                  <View style={styles.paymentStepRow}>
                    <View style={styles.paymentStepNumber}>
                      <Text style={styles.paymentStepNumberText}>2</Text>
                    </View>
                    <Text style={styles.paymentStepText}>
                      {selectedPaymentMethod === "mobile_banking"
                        ? `Send ${numericPrice} ETB from your banking app`
                        : `Send ${numericPrice} ETB in Telebirr`}
                    </Text>
                  </View>

                  <View style={styles.paymentStepRow}>
                    <View style={styles.paymentStepNumber}>
                      <Text style={styles.paymentStepNumberText}>3</Text>
                    </View>
                    <Text style={styles.paymentStepText}>
                      Come back and tap I've paid
                    </Text>
                  </View>
                </View>
                <Pressable
              style={[
                styles.modalPaidButton,
                (joining || offerExpiredLocally) &&
                  styles.disabledButton,
              ]}
              onPress={handleSubmitPayment}
              disabled={joining || offerExpiredLocally}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#07111F" />
              ) : (
                <Text style={styles.modalPaidButtonText}>
                  I've paid
                </Text>
              )}
            </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* PAYMENT SUBMITTED MODAL */}

      <Modal
        visible={paymentSubmittedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setPaymentSubmittedModalVisible(false)
        }
      >
        <View style={styles.waitlistModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setPaymentSubmittedModalVisible(false)
            }
          />

          <View style={styles.waitlistModalSheet}>
            <View style={styles.waitlistModalHandle} />

            <View
              style={styles.paymentSubmittedIcon}
            >
              <Ionicons
                name="checkmark"
                size={34}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.waitlistModalTitle}>
              Payment sent
            </Text>

            <Text style={styles.waitlistModalSubtitle}>
              We'll confirm it with the organizer.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.waitlistGotItButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() =>
                setPaymentSubmittedModalVisible(false)
              }
            >
              <Text style={styles.waitlistGotItButtonText}>
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  paymentFlowTitle: {
    color: "#101828",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
  },

  paymentChoiceSubtitle: {
    color: "#667085",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 7,
    marginBottom: 20,
  },

  paymentChoiceCard: {
    width: "100%",
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  paymentChoiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EAF9FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  paymentChoiceText: {
    flex: 1,
  },

  paymentChoiceTitle: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "800",
  },

  paymentChoiceDescription: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 3,
  },

  changePaymentMethodButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },

  changePaymentMethodText: {
    color: "#087EA4",
    fontSize: 13,
    fontWeight: "800",
  },

  paymentBankName: {
    color: "#344054",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },

  paymentFlowAmount: {
    color: "#101828",
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.8,
    marginTop: 8,
  },

  paymentFlowRecipient: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 18,
  },

  paymentFlowCopyButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#EAF9FF",
    borderWidth: 1,
    borderColor: "#CDEFFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  paymentFlowCopyButtonCopied: {
    backgroundColor: "#E9F8EF",
    borderColor: "#B8E7C9",
  },

  paymentFlowCopyText: {
    color: "#087EA4",
    fontSize: 16,
    fontWeight: "900",
  },

  paymentFlowCopyTextCopied: {
    color: "#149447",
  },

  paymentSteps: {
    width: "100%",
    gap: 12,
    marginTop: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  paymentStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  paymentStepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentStepNumberText: {
    color: "#475467",
    fontSize: 13,
    fontWeight: "900",
  },

  paymentStepText: {
    flex: 1,
    color: "#475467",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },

  paymentSubmittedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#149447",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  paymentSubmittedStatus: {
    width: "100%",
    minHeight: 58,
    marginTop: 22,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#E9F8EF",
    borderWidth: 1,
    borderColor: "#B8E7C9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  paymentSubmittedStatusText: {
    color: "#149447",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 1,
  },

  paymentSubmittedDoneButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  paymentSubmittedDoneText: {
    color: "#667085",
    fontSize: 15,
    fontWeight: "700",
  },

  simpleProviderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
  },

  simpleProviderName: {
    color: "#344054",
    fontSize: 16,
    fontWeight: "800",
  },

  simpleAccountName: {
    color: "#667085",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },

  simpleCopyButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#EAF9FF",
    borderWidth: 1,
    borderColor: "#CDEFFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },

  simpleCopyButtonCopied: {
    backgroundColor: "#E9F8EF",
    borderColor: "#B8E7C9",
  },

  simpleCopyButtonText: {
    color: "#087EA4",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1,
  },

  simpleCopyButtonTextCopied: {
    color: "#149447",
  },

  simpleThenPay: {
    color: "#667085",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },

  simpleMissingNumber: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },

  paymentAmount: {
    color: "#101828",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.7,
  },

  paymentTitle: {
    color: "#344054",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 3,
  },

  paymentGameTitle: {
    color: "#98A2B3",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
  },

  copyPaymentButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#EAF9FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  copyPaymentButtonPressed: {
    opacity: 0.65,
  },

  copyPaymentText: {
    color: "#087EA4",
    fontSize: 15,
    fontWeight: "800",
  },

  paymentInstructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 17,
    paddingHorizontal: 2,
  },

  paymentInstruction: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    flex: 1,
  },

  paymentConfirmationText: {
    color: "#98A2B3",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 11,
    marginBottom: 2,
  },

  modalCloseButton: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  confirmedFooter: {
    minHeight: 82,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  directionsButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: c.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  directionsButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  directionsButtonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "center",
  },

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
    flexShrink: 0,
    minWidth: 82,
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
    flexShrink: 0,
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

  waitingForOrganizerButton: {
    backgroundColor: "#E9F8EF",
    borderWidth: 1,
    borderColor: "#B8E7C9",
  },

  waitingForOrganizerButtonText: {
    color: "#149447",
  },

  confirmedButton: {
    backgroundColor: "#E9F8EF",
    borderWidth: 1,
    borderColor: "#B8E7C9",
  },

  confirmedButtonText: {
    color: "#149447",
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

  waitlistedButton: {
    backgroundColor: "#EEF4F8",
    borderWidth: 1,
    borderColor: "#D7E2EA",
  },

  waitlistedButtonText: {
    color: "#46647A",
    fontWeight: "800",
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
    textAlign: "center",
  },

  waitlistModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 11, 18, 0.72)",
    justifyContent: "flex-end",
  },

  waitlistModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: "center",
  },

  waitlistModalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    marginBottom: 24,
  },

  waitlistModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EAF9FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  waitlistModalTitle: {
    color: "#101828",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
  },

  waitlistModalSubtitle: {
    color: "#667085",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 7,
    paddingHorizontal: 12,
  },

  waitlistGameCard: {
    width: "100%",
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 22,
  },

  waitlistGameTitle: {
    flex: 1,
    color: "#101828",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },

  waitlistGotItButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  waitlistGotItButtonText: {
    color: "#07111F",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
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
    paddingBottom: 22,
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

  cancelledFooter: {
    minHeight: 86,
    backgroundColor: "#FFF5F4",
    borderTopWidth: 1,
    borderTopColor: "#F5C2BD",
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  cancelledIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEE4E2",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelledContent: {
    flex: 1,
  },

  cancelledTitle: {
    color: "#B42318",
    fontSize: 16,
    fontWeight: "900",
  },

  cancelledText: {
    color: "#7A4540",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});