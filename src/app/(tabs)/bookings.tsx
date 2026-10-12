import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "expo-router";

import { useLanguage } from "../../i18n/LanguageContext";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ConfirmModal from "../../components/ConfirmModal";
import { COLORS } from "../../constants/colors";

import { supabase } from "../../lib/supabase";

type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "waitlisted"
  | "cancelled_by_player"
  | "cancelled_by_organizer";

type PaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refund_pending"
  | "refunded"
  | null;

type Booking = {
  id: number;

  status: BookingStatus;

  price_paid: number | null;

  payment_status: PaymentStatus;

  payment_offer_expires_at: string | null;

  created_at: string;

  games: {
    id: number;

    title: string;

    organizer: string;

    area: string;

    distance: string | null;

    time: string;

    format: string;

    skill: string;

    price: number;

    image_url: string | null;

    starts_at: string | null;

    ends_at: string | null;

    status: string;
  } | null;
};

export default function BookingsScreen() {
  const { language, t } = useLanguage();

  const dateLocale =
    language === "am"
      ? "am-ET-u-ca-gregory"
      : language === "om"
        ? "om-ET-u-ca-gregory"
        : "en-US-u-ca-gregory";

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);

  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [refundingId, setRefundingId] = useState<number | null>(null);

  const [checkingPaymentId, setCheckingPaymentId] = useState<number | null>(
    null,
  );

  const [startingPaymentId, setStartingPaymentId] = useState<number | null>(
    null,
  );

  const [paymentAttemptBookingIds, setPaymentAttemptBookingIds] = useState<
    Set<number>
  >(new Set());

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, []),
  );

  async function fetchBookings() {
    setLoading(true);

    const {
      data: { user },

      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log(
        "Booking user error:",

        userError?.message || "No user",
      );

      setBookings([]);

      setLoading(false);

      return;
    }

    const { data, error } = await supabase

      .from("bookings")

      .select(
        `



      id,



status,



price_paid,



payment_status,



payment_offer_expires_at,



created_at,



games (



            id,



            title,



            organizer,



            area,



            distance,



            time,



            format,



            skill,



            price,



            image_url,



            starts_at,



            ends_at,



            status



          )



        `,
      )

      .eq("user_id", user.id)

      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log(
        "Bookings error:",

        error.message,
      );

      setBookings([]);

      setLoading(false);

      return;
    }

    const loadedBookings = (data || []) as unknown as Booking[];

    setBookings(loadedBookings);

    // A fresh waitlist offer is pending_payment but has no active

    // Chapa payment yet. Once a payment exists, show Check Payment.

    const pendingBookingIds = loadedBookings

      .filter((booking) => booking.status === "pending_payment")

      .map((booking) => booking.id);

    if (pendingBookingIds.length === 0) {
      setPaymentAttemptBookingIds(new Set());

      setLoading(false);

      return;
    }

    const { data: paymentRows, error: paymentRowsError } = await supabase

      .from("payments")

      .select("booking_id, status")

      .in("booking_id", pendingBookingIds)

      .eq("provider", "chapa")

      .in("status", ["pending", "paid"]);

    if (paymentRowsError) {
      console.log(
        "Payment attempt lookup error:",

        paymentRowsError.message,
      );

      // Safer fallback: avoid accidentally starting a duplicate payment.

      setPaymentAttemptBookingIds(new Set(pendingBookingIds));
    } else {
      setPaymentAttemptBookingIds(
        new Set(
          (paymentRows || [])

            .map((payment) => Number(payment.booking_id))

            .filter((id) => Number.isInteger(id)),
        ),
      );
    }

    setLoading(false);
  }

  function openCancellationModal(booking: Booking) {
    if (!isActiveBooking(booking.status)) {
      return;
    }

    setErrorMessage(null);

    setSelectedBooking(booking);
  }

  function closeCancellationModal() {
    if (cancellingId !== null) {
      return;
    }

    setSelectedBooking(null);

    setErrorMessage(null);
  }

  async function cancelSelectedBooking() {
    if (!selectedBooking || !selectedBooking.games) {
      return;
    }

    if (!isActiveBooking(selectedBooking.status)) {
      return;
    }

    const booking = selectedBooking;

    setErrorMessage(null);

    setCancellingId(booking.id);

    const {
      data: cancelData,

      error: cancelError,
    } = await supabase.rpc("cancel_booking", {
      p_game_id: Number(booking.games.id),
    });

    if (cancelError) {
      console.log(
        "Cancel booking error:",

        cancelError.message,
      );

      setCancellingId(null);

      setErrorMessage(cancelError.message);

      return;
    }

    const refundRequired =
      cancelData?.refund_required === true || booking.payment_status === "paid";

    // Free booking or waitlist:

    // cancellation is already finished.

    if (!refundRequired) {
      setCancellingId(null);

      setSelectedBooking(null);

      setErrorMessage(null);

      await fetchBookings();

      return;
    }

    // Paid booking:

    // cancel_booking has changed it to refund_pending.

    const {
      data: refundData,

      error: refundError,
    } = await supabase.functions.invoke(
      "refund-chapa-payment",

      {
        body: {
          booking_id: booking.id,
        },
      },
    );

    if (refundError) {
      console.log(
        "Refund request error:",

        refundError.message,
      );

      // The booking is still cancelled.

      // Keep refund_pending so we can retry later.

      setCancellingId(null);

      setSelectedBooking(null);

      setErrorMessage(null);

      await fetchBookings();

      return;
    }

    console.log(
      "Refund request:",

      refundData?.status ?? "submitted",
    );

    // Check Chapa a few times.

    // If it is still processing, it remains refund_pending.

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const {
        data: verifyData,

        error: verifyError,
      } = await supabase.functions.invoke(
        "verify-chapa-refund",

        {
          body: {
            booking_id: booking.id,
          },
        },
      );

      if (verifyError) {
        console.log(
          "Refund verification error:",

          verifyError.message,
        );

        break;
      }

      if (verifyData?.status === "refunded") {
        break;
      }

      if (verifyData?.status === "reversed") {
        break;
      }
    }

    setCancellingId(null);

    setSelectedBooking(null);

    setErrorMessage(null);

    await fetchBookings();
  }

  async function startWaitlistPayment(booking: Booking) {
    if (!booking.games) {
      return;
    }

    if (
      booking.status !== "pending_payment" ||
      !booking.payment_offer_expires_at
    ) {
      return;
    }

    const expiration = new Date(booking.payment_offer_expires_at).getTime();

    if (!Number.isFinite(expiration) || expiration <= Date.now()) {
      await fetchBookings();

      return;
    }

    setStartingPaymentId(booking.id);

    try {
      const { data: paymentData, error: paymentError } =
        await supabase.functions.invoke("create-chapa-payment", {
          body: {
            game_id: Number(booking.games.id),

            booking_id: booking.id,
          },
        });

      if (paymentError) {
        console.log(
          "Waitlist payment start error:",

          paymentError.message,
        );

        return;
      }

      if (!paymentData?.success) {
        console.log(
          "Waitlist payment start failed:",

          paymentData?.error ?? "Unknown error",
        );

        return;
      }

      setPaymentAttemptBookingIds((current) => {
        const next = new Set(current);

        next.add(booking.id);

        return next;
      });

      const paymentId = Number(paymentData.payment_id);

      if (!Number.isInteger(paymentId) || paymentId <= 0) {
        await fetchBookings();

        return;
      }

      // Match the short automatic verification behavior used on Discover.

      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const { data: verifyData, error: verifyError } =
          await supabase.functions.invoke("verify-chapa-payment", {
            body: {
              payment_id: paymentId,
            },
          });

        if (verifyError) {
          console.log(
            "Waitlist payment verification error:",

            verifyError.message,
          );

          continue;
        }

        if (
          verifyData?.paid === true ||
          verifyData?.status === "paid" ||
          verifyData?.status === "refund_pending" ||
          verifyData?.status === "expired" ||
          verifyData?.status === "failed"
        ) {
          break;
        }
      }
    } finally {
      setStartingPaymentId(null);

      await fetchBookings();
    }
  }

  async function checkPendingPayment(booking: Booking) {
    if (booking.payment_status !== "pending") {
      return;
    }

    setCheckingPaymentId(booking.id);

    try {
      const { data: payment, error: paymentError } = await supabase

        .from("payments")

        .select("id")

        .eq("booking_id", booking.id)

        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")

        .order("created_at", { ascending: false })

        .limit(1)

        .maybeSingle();

      if (paymentError) {
        console.log(
          "Payment lookup error:",

          paymentError.message,
        );

        return;
      }

      if (!payment) {
        console.log(
          "No payment record found for booking:",

          booking.id,
        );

        return;
      }

      const {
        data: verifyData,

        error: verifyError,
      } = await supabase.functions.invoke(
        "verify-chapa-payment",

        {
          body: {
            payment_id: payment.id,
          },
        },
      );

      if (verifyError) {
        console.log(
          "Payment verification error:",

          verifyError.message,
        );

        return;
      }

      console.log(
        "Payment verification:",

        verifyData?.status ?? "unknown",
      );
    } finally {
      setCheckingPaymentId(null);

      await fetchBookings();
    }
  }

  async function processPendingRefund(booking: Booking) {
    if (booking.payment_status !== "refund_pending") {
      return;
    }

    setRefundingId(booking.id);

    try {
      const { data: refundData, error: refundError } =
        await supabase.functions.invoke(
          "refund-chapa-payment",

          {
            body: {
              booking_id: booking.id,
            },
          },
        );

      if (refundError) {
        console.log(
          "Refund request error:",

          refundError.message,
        );

        return;
      }

      console.log(
        "Refund request:",

        refundData?.status ?? "submitted",
      );

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const {
          data: verifyData,

          error: verifyError,
        } = await supabase.functions.invoke(
          "verify-chapa-refund",

          {
            body: {
              booking_id: booking.id,
            },
          },
        );

        if (verifyError) {
          console.log(
            "Refund verification error:",

            verifyError.message,
          );

          break;
        }

        if (
          verifyData?.status === "refunded" ||
          verifyData?.status === "reversed"
        ) {
          break;
        }
      }
    } finally {
      setRefundingId(null);

      await fetchBookings();
    }
  }

  const selectedIsWaitlisted = selectedBooking?.status === "waitlisted";

  const selectedNeedsRefund =
    selectedBooking?.status === "confirmed" &&
    selectedBooking?.payment_status === "paid";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}

        contentContainerStyle={styles.content}

        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("bookings.title")}</Text>

        <Text style={styles.subtitle}>{t("bookings.subtitle")}</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"

              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>{t("bookings.loading")}</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"

                size={34}

                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>{t("bookings.noBookings")}</Text>

            <Text style={styles.emptyText}>
              {t("bookings.noBookingsDescription")}
            </Text>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {bookings.map((booking) => {
              const game = booking.games;

              if (!game) {
                return null;
              }

              const isWaitlisted = booking.status === "waitlisted";

              const isConfirmed = booking.status === "confirmed";

              const cancelledByPlayer =
                booking.status === "cancelled_by_player";

              const cancelledByOrganizer =
                booking.status === "cancelled_by_organizer";

              const isCancelled = cancelledByPlayer || cancelledByOrganizer;

              const isCancelling = cancellingId === booking.id;

              const statusInfo = getStatusInfo(
                booking.status,

                t,
              );

              return (
                <View
                  key={booking.id}

                  style={[styles.card, isCancelled && styles.cancelledCard]}
                >
                  <View style={styles.imageWrapper}>
                    {game.image_url ? (
                      <Image
                        source={{
                          uri: game.image_url,
                        }}

                        style={[
                          styles.image,

                          isCancelled && styles.cancelledImage,
                        ]}

                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.imagePlaceholder,

                          isCancelled && styles.cancelledImage,
                        ]}
                      >
                        <Ionicons
                          name="football"

                          size={42}

                          color={
                            isCancelled ? COLORS.textMuted : COLORS.primary
                          }
                        />
                      </View>
                    )}

                    {isCancelled && (
                      <View style={styles.cancelledOverlay}>
                        <Ionicons
                          name="close-circle"

                          size={26}

                          color="#FF747A"
                        />

                        <Text style={styles.cancelledOverlayText}>
                          {t("bookings.cancelled")}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusBadge,

                          {
                            backgroundColor: statusInfo.backgroundColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name={statusInfo.icon}

                          size={16}

                          color={statusInfo.color}
                        />

                        <Text
                          style={[
                            styles.statusText,

                            {
                              color: statusInfo.color,
                            },
                          ]}
                        >
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.gameTitle,

                        isCancelled && styles.cancelledGameTitle,
                      ]}
                    >
                      {game.title}
                    </Text>

                    <Text style={styles.organizer}>
                      {t("bookings.by")} {game.organizer}
                    </Text>

                    {game.starts_at ? (
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="calendar-outline"

                          size={18}

                          color={COLORS.textSecondary}
                        />

                        <Text style={styles.infoText}>
                          {formatAddisDate(
                            game.starts_at,

                            dateLocale,
                          )}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.infoRow}>
                      <Ionicons
                        name="location-outline"

                        size={18}

                        color={COLORS.textSecondary}
                      />

                      <Text style={styles.infoText}>
                        {game.area}

                        {game.distance ? ` • ${game.distance}` : ""}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons
                        name="time-outline"

                        size={18}

                        color={COLORS.textSecondary}
                      />

                      <Text style={styles.infoText}>{game.time}</Text>
                    </View>

                    <View style={styles.bottomRow}>
                      <View style={styles.formatBadge}>
                        <Text style={styles.formatText}>{game.format}</Text>
                      </View>

                      <Text
                        style={[
                          styles.price,

                          isCancelled && styles.cancelledPrice,
                        ]}
                      >
                        {isWaitlisted
                          ? `${game.price} ETB`
                          : `${booking.price_paid ?? game.price} ETB`}
                      </Text>
                    </View>

                    {cancelledByOrganizer && (
                      <View style={styles.historyNotice}>
                        <Ionicons
                          name={
                            booking.payment_status === "refunded"
                              ? "checkmark-circle-outline"
                              : "information-circle-outline"
                          }

                          size={20}

                          color={
                            booking.payment_status === "refunded"
                              ? COLORS.primary
                              : booking.payment_status === "refund_pending"
                                ? "#F6C85F"
                                : "#FF9A9E"
                          }
                        />

                        <Text style={styles.historyNoticeText}>
                          {booking.payment_status === "refunded"
                            ? `${booking.price_paid ?? game.price} ${t(
                                "bookings.refundOrganizer",
                              )}`
                            : booking.payment_status === "refund_pending"
                              ? t("bookings.organizerRefundPending")
                              : t("bookings.organizerCancelledHistory")}
                        </Text>
                      </View>
                    )}

                    {cancelledByPlayer && (
                      <View style={styles.historyNotice}>
                        <Ionicons
                          name="information-circle-outline"

                          size={20}

                          color={
                            booking.payment_status === "refunded"
                              ? COLORS.primary
                              : COLORS.textSecondary
                          }
                        />

                        <Text style={styles.historyNoticeText}>
                          {booking.payment_status === "refunded"
                            ? `${booking.price_paid ?? game.price} ${t(
                                "bookings.refundedToPayment",
                              )}`
                            : booking.payment_status === "refund_pending"
                              ? t("bookings.refundProcessing")
                              : t("bookings.playerCancelledHistory")}
                        </Text>
                      </View>
                    )}

                    {booking.status === "pending_payment" &&
                      booking.payment_status === "pending" &&
                      !isCancelled &&
                      (() => {
                        const offerExpiration = booking.payment_offer_expires_at
                          ? new Date(booking.payment_offer_expires_at).getTime()
                          : null;

                        const offerMsLeft = offerExpiration
                          ? Math.max(0, offerExpiration - now)
                          : 0;

                        const offerSeconds = Math.ceil(offerMsLeft / 1000);

                        const offerMinutes = Math.floor(offerSeconds / 60);

                        const offerRemainingSeconds = offerSeconds % 60;

                        const countdown = `${String(offerMinutes).padStart(
                          2,
                          "0",
                        )}:${String(offerRemainingSeconds).padStart(2, "0")}`;

                        const hasOffer =
                          booking.status === "pending_payment" &&
                          !!booking.payment_offer_expires_at;

                        const offerExpired = hasOffer && offerMsLeft <= 0;

                        const hasPaymentAttempt = paymentAttemptBookingIds.has(
                          booking.id,
                        );

                        const freshWaitlistOffer =
                          hasOffer && !offerExpired && !hasPaymentAttempt;

                        if (freshWaitlistOffer) {
                          return (
                            <>
                              <View style={styles.waitlistOfferNotice}>
                                <View style={styles.waitlistOfferHeader}>
                                  <View style={styles.waitlistOfferTitleRow}>
                                    <Ionicons
                                      name="football-outline"

                                      size={20}

                                      color={COLORS.success}
                                    />

                                    <Text style={styles.waitlistOfferTitle}>
                                      {t("bookings.spotOpened")}
                                    </Text>
                                  </View>

                                  <View style={styles.waitlistCountdown}>
                                    <Ionicons
                                      name="time-outline"

                                      size={15}

                                      color="#F6C85F"
                                    />

                                    <Text style={styles.waitlistCountdownText}>
                                      {countdown}
                                    </Text>
                                  </View>
                                </View>

                                <Text style={styles.waitlistOfferText}>
                                  {game.price} ETB •{" "}
                                  {t("bookings.payBeforeTimer")}
                                </Text>
                              </View>

                              <Pressable
                                style={[
                                  styles.waitlistPayButton,

                                  startingPaymentId === booking.id &&
                                    styles.disabledButton,
                                ]}

                                onPress={() => startWaitlistPayment(booking)}

                                disabled={startingPaymentId === booking.id}
                              >
                                {startingPaymentId === booking.id ? (
                                  <>
                                    <ActivityIndicator
                                      size="small"

                                      color={COLORS.background}
                                    />

                                    <Text style={styles.waitlistPayButtonText}>
                                      {t("bookings.connectingTelebirr")}
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <Ionicons
                                      name="phone-portrait-outline"

                                      size={20}

                                      color={COLORS.background}
                                    />

                                    <Text style={styles.waitlistPayButtonText}>
                                      {game.price} ETB •{" "}
                                      {t("bookings.payWithTelebirr")}
                                    </Text>
                                  </>
                                )}
                              </Pressable>
                            </>
                          );
                        }

                        if (hasOffer && offerExpired && !hasPaymentAttempt) {
                          return (
                            <View style={styles.expiredOfferNotice}>
                              <Ionicons
                                name="time-outline"

                                size={20}

                                color="#FF9A9E"
                              />

                              <Text style={styles.expiredOfferText}>
                                {t("bookings.paymentOfferExpired")}
                              </Text>
                            </View>
                          );
                        }

                        return (
                          <>
                            {hasOffer && !offerExpired && (
                              <View style={styles.paymentCountdownNotice}>
                                <Ionicons
                                  name="time-outline"

                                  size={20}

                                  color="#F6C85F"
                                />

                                <Text style={styles.historyNoticeText}>
                                  {t("bookings.spotReserved")} {countdown}.
                                </Text>
                              </View>
                            )}

                            <View style={styles.historyNotice}>
                              <Ionicons
                                name="time-outline"

                                size={20}

                                color="#F6C85F"
                              />

                              <Text style={styles.historyNoticeText}>
                                {t("bookings.telebirrPending")}
                              </Text>
                            </View>

                            <Pressable
                              style={[
                                styles.refundButton,

                                checkingPaymentId === booking.id &&
                                  styles.disabledButton,
                              ]}

                              onPress={() => checkPendingPayment(booking)}

                              disabled={checkingPaymentId === booking.id}
                            >
                              {checkingPaymentId === booking.id ? (
                                <>
                                  <ActivityIndicator
                                    size="small"

                                    color={COLORS.primary}
                                  />

                                  <Text style={styles.refundButtonText}>
                                    {t("bookings.checkingPayment")}
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Ionicons
                                    name="refresh-outline"

                                    size={20}

                                    color={COLORS.primary}
                                  />

                                  <Text style={styles.refundButtonText}>
                                    {t("bookings.checkPayment")}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </>
                        );
                      })()}

                    {isCancelled &&
                      booking.payment_status === "refund_pending" && (
                        <Pressable
                          style={[
                            styles.refundButton,

                            refundingId === booking.id && styles.disabledButton,
                          ]}

                          onPress={() => processPendingRefund(booking)}

                          disabled={refundingId === booking.id}
                        >
                          {refundingId === booking.id ? (
                            <>
                              <ActivityIndicator
                                size="small"

                                color={COLORS.primary}
                              />

                              <Text style={styles.refundButtonText}>
                                {t("bookings.checkingRefund")}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Ionicons
                                name="refresh-outline"

                                size={20}

                                color={COLORS.primary}
                              />

                              <Text style={styles.refundButtonText}>
                                {t("bookings.retryRefund")}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      )}

                    {(isConfirmed || isWaitlisted) && (
                      <Pressable
                        style={[
                          styles.cancelButton,

                          isCancelling && styles.disabledButton,
                        ]}

                        onPress={() => openCancellationModal(booking)}

                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <ActivityIndicator
                            size="small"

                            color="#FF747A"
                          />
                        ) : (
                          <>
                            <Ionicons
                              name={
                                isWaitlisted
                                  ? "exit-outline"
                                  : "close-circle-outline"
                              }

                              size={20}

                              color="#FF747A"
                            />

                            <Text style={styles.cancelText}>
                              {isWaitlisted
                                ? t("bookings.leaveWaitlist")
                                : t("bookings.cancelBooking")}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      <ConfirmModal
        visible={selectedBooking !== null}

        title={
          selectedIsWaitlisted
            ? t("bookings.leaveWaitlistQuestion")
            : t("bookings.cancelBookingQuestion")
        }

        message={
          errorMessage
            ? `${t("bookings.somethingWentWrong")} ${errorMessage}`
            : selectedIsWaitlisted
              ? `${t("bookings.leaveWaitlistMessage")} ${
                  selectedBooking?.games?.title ?? t("bookings.thisGame")
                }? ${t("bookings.leaveWaitlistHistory")}`
              : selectedNeedsRefund
                ? `${t("bookings.cancelBooking")} ${
                    selectedBooking?.games?.title ?? t("bookings.thisGame")
                  }? ${t("bookings.cancelRefundMessage")}`
                : `${t("bookings.cancelBooking")} ${
                    selectedBooking?.games?.title ?? t("bookings.thisGame")
                  }? ${t("bookings.cancelNormalMessage")}`
        }

        cancelText={t("bookings.keepBooking")}

        confirmText={
          selectedIsWaitlisted
            ? t("bookings.leaveWaitlist")
            : t("bookings.cancelBooking")
        }

        destructive

        loading={
          selectedBooking !== null && cancellingId === selectedBooking.id
        }

        onCancel={closeCancellationModal}

        onConfirm={cancelSelectedBooking}
      />
    </SafeAreaView>
  );
}

function isActiveBooking(status: BookingStatus) {
  return status === "confirmed" || status === "waitlisted";
}

function getStatusInfo(
  status: BookingStatus,

  t: (key: string) => string,
): {
  label: string;

  color: string;

  backgroundColor: string;

  icon: "checkmark-circle" | "time-outline" | "close-circle";
} {
  if (status === "pending_payment") {
    return {
      label: t("bookings.paymentPending"),

      color: "#F6C85F",

      backgroundColor: "#2A2415",

      icon: "time-outline",
    };
  }

  if (status === "confirmed") {
    return {
      label: t("bookings.confirmed"),
      color: "#FFFFFF",
      backgroundColor: "#15803D",
      icon: "checkmark-circle",
    };
  }

  if (status === "waitlisted") {
    return {
      label: t("bookings.waitlisted"),

      color: "#F6C85F",

      backgroundColor: "#2A2415",

      icon: "time-outline",
    };
  }

  if (status === "cancelled_by_organizer") {
    return {
      label: t("bookings.gameCancelled"),

      color: "#FF9A9E",

      backgroundColor: "#3A2022",

      icon: "close-circle",
    };
  }

  return {
    label: t("bookings.cancelled"),

    color: COLORS.textSecondary,

    backgroundColor: "#26312D",

    icon: "close-circle",
  };
}

function formatAddisDate(
  timestamp: string,

  locale: string,
) {
  return new Intl.DateTimeFormat(
    locale,

    {
      timeZone: "Africa/Addis_Ababa",

      weekday: "short",

      month: "short",

      day: "numeric",

      year: "numeric",
    },
  ).format(new Date(timestamp));
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
    paddingHorizontal: 18,

    paddingTop: 14,
  },

  title: {
    color: COLORS.text,

    fontSize: 36,

    fontWeight: "800",

    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,

    fontSize: 16,

    marginTop: 4,

    marginBottom: 24,
  },

  loadingContainer: {
    alignItems: "center",

    paddingTop: 80,
  },

  loadingText: {
    color: COLORS.textSecondary,

    fontSize: 15,

    marginTop: 14,
  },

  emptyContainer: {
    alignItems: "center",

    paddingTop: 80,

    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 68,

    height: 68,

    borderRadius: 34,

    backgroundColor: COLORS.surfaceSoft,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 18,
  },

  emptyTitle: {
    color: COLORS.text,

    fontSize: 21,

    fontWeight: "800",
  },

  emptyText: {
    color: COLORS.textSecondary,

    fontSize: 15,

    marginTop: 7,

    textAlign: "center",
  },

  bookingList: {
    gap: 18,
  },

  card: {
    backgroundColor: COLORS.surface,

    borderRadius: 22,

    borderWidth: 1,

    borderColor: COLORS.border,

    overflow: "hidden",
  },

  cancelledCard: {
    borderColor: "#3D3433",
  },

  imageWrapper: {
    position: "relative",
  },

  image: {
    width: "100%",

    height: 170,
  },

  cancelledImage: {
    opacity: 0.45,
  },

  imagePlaceholder: {
    width: "100%",

    height: 170,

    backgroundColor: COLORS.surfaceSoft,

    alignItems: "center",

    justifyContent: "center",
  },

  cancelledOverlay: {
    position: "absolute",

    top: 12,

    right: 12,

    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    backgroundColor: "#211718",

    borderWidth: 1,

    borderColor: "#6A3538",

    borderRadius: 18,

    paddingHorizontal: 10,

    paddingVertical: 7,
  },

  cancelledOverlayText: {
    color: "#FF9A9E",

    fontSize: 12,

    fontWeight: "800",
  },

  cardContent: {
    padding: 17,
  },

  statusRow: {
    flexDirection: "row",

    marginBottom: 12,
  },

  statusBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    borderRadius: 16,

    paddingHorizontal: 10,

    paddingVertical: 6,
  },

  statusText: {
    fontSize: 13,

    fontWeight: "700",
  },

  gameTitle: {
    color: COLORS.text,

    fontSize: 21,

    fontWeight: "800",
  },

  cancelledGameTitle: {
    color: "#C6CFCA",
  },

  organizer: {
    color: COLORS.textSecondary,

    fontSize: 15,

    marginTop: 3,

    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 7,

    marginTop: 8,
  },

  infoText: {
    color: COLORS.textSecondary,

    fontSize: 15,

    flexShrink: 1,
  },

  bottomRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginTop: 18,
  },

  formatBadge: {
    backgroundColor: COLORS.surfaceSoft,

    borderRadius: 14,

    paddingHorizontal: 12,

    paddingVertical: 7,
  },

  formatText: {
    color: COLORS.textSecondary,

    fontSize: 14,

    fontWeight: "700",
  },

  price: {
    color: COLORS.text,

    fontSize: 19,

    fontWeight: "800",
  },

  cancelledPrice: {
    color: COLORS.textSecondary,
  },

  historyNotice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#0A211C",

    borderRadius: 12,

    padding: 12,

    marginTop: 17,
  },

  historyNoticeText: {
    color: COLORS.textSecondary,

    fontSize: 12,

    lineHeight: 17,

    flex: 1,
  },

  cancelButton: {
    height: 48,

    borderRadius: 13,

    borderWidth: 1,

    borderColor: "#7A3437",

    marginTop: 18,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  cancelText: {
    color: "#FF747A",

    fontSize: 15,

    fontWeight: "700",
  },

  refundButton: {
    height: 48,

    borderRadius: 13,

    borderWidth: 1,

    borderColor: "#287D58",

    marginTop: 12,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  refundButtonText: {
    color: COLORS.primary,

    fontSize: 15,

    fontWeight: "700",
  },

  waitlistOfferNotice: {
    backgroundColor: "#102B22",

    borderWidth: 1,

    borderColor: COLORS.primary,

    borderRadius: 13,

    padding: 12,

    marginTop: 17,
  },

  waitlistOfferHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 8,
  },

  waitlistOfferTitleRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 7,

    flexShrink: 1,
  },

  waitlistOfferTitle: {
    color: COLORS.success,

    fontSize: 15,

    fontWeight: "800",
  },

  waitlistCountdown: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    backgroundColor: "#2A2415",

    borderRadius: 12,

    paddingHorizontal: 8,

    paddingVertical: 5,
  },

  waitlistCountdownText: {
    color: "#F6C85F",

    fontSize: 13,

    fontWeight: "800",

    fontVariant: ["tabular-nums"],
  },

  waitlistOfferText: {
    color: COLORS.textSecondary,

    fontSize: 13,

    lineHeight: 19,

    marginTop: 9,
  },

  waitlistPayButton: {
    height: 50,

    borderRadius: 13,

    backgroundColor: COLORS.primary,

    marginTop: 12,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  waitlistPayButtonText: {
    color: COLORS.background,

    fontSize: 15,

    fontWeight: "800",
  },

  expiredOfferNotice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#2B1C1E",

    borderWidth: 1,

    borderColor: "#6B3439",

    borderRadius: 12,

    padding: 12,

    marginTop: 17,
  },

  expiredOfferText: {
    color: "#FF9A9E",

    fontSize: 12,

    lineHeight: 17,

    flex: 1,
  },

  paymentCountdownNotice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 12,

    padding: 12,

    marginTop: 17,
  },

  disabledButton: {
    opacity: 0.6,
  },
});