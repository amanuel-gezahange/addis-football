import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Image,
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

type BookingStatus =
  | "confirmed"
  | "waitlisted"
  | "pending_payment"
  | null;

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function formatCountdown(milliseconds: number) {
  if (milliseconds <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.ceil(
    milliseconds / 1000
  );

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const seconds =
    totalSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export default function GameCard({
  game,
}: Props) {
  const { t } = useLanguage();
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
  const [
    bookingStatus,
    setBookingStatus,
  ] = useState<BookingStatus>(null);

  const [
    bookingId,
    setBookingId,
  ] = useState<number | null>(null);

  const [
    paymentOfferExpiresAt,
    setPaymentOfferExpiresAt,
  ] = useState<string | null>(null);

  const [
    hasPaymentAttempt,
    setHasPaymentAttempt,
  ] = useState(false);

  const [
    countdownNow,
    setCountdownNow,
  ] = useState(Date.now());

  const [joining, setJoining] =
    useState(false);

  const [
    paymentMessage,
    setPaymentMessage,
  ] = useState<string | null>(null);

  const [spotsLeft, setSpotsLeft] =
    useState(
      Number(game.spotsLeft ?? 0)
    );

  const price = Number(
    game.price ?? 0
  );

  const isPaidGame = price > 0;

  const isFull =
    game.status === "full" ||
    spotsLeft <= 0;

  const isConfirmed =
    bookingStatus === "confirmed";

  const isWaitlisted =
    bookingStatus === "waitlisted";

  const isPendingPayment =
    bookingStatus ===
    "pending_payment";

  const offerExpirationMs =
    paymentOfferExpiresAt
      ? new Date(
        paymentOfferExpiresAt
      ).getTime()
      : null;

  const offerMillisecondsLeft =
    offerExpirationMs
      ? Math.max(
        0,
        offerExpirationMs -
        countdownNow
      )
      : 0;

  const isPaidWaitlistOffer =
    isPendingPayment &&
    !!paymentOfferExpiresAt;

  const isOfferExpired =
    isPaidWaitlistOffer &&
    offerMillisecondsLeft <= 0;

  const canPayWaitlistOffer =
    isPaidWaitlistOffer &&
    !isOfferExpired &&
    !hasPaymentAttempt;

  const waitlistCountdown =
    formatCountdown(
      offerMillisecondsLeft
    );

  // Keep spots synchronized with
  // fresh game data.
  useEffect(() => {
    setSpotsLeft(
      Number(game.spotsLeft ?? 0)
    );
  }, [game.spotsLeft]);

  // Update the waitlist-offer countdown.
  useEffect(() => {
    if (!paymentOfferExpiresAt) {
      return;
    }

    setCountdownNow(Date.now());

    const interval =
      setInterval(() => {
        setCountdownNow(
          Date.now()
        );
      }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [paymentOfferExpiresAt]);

  // Load this user's booking.
  useEffect(() => {
    async function checkBooking() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setBookingStatus(null);
        setBookingId(null);
        setPaymentOfferExpiresAt(
          null
        );
        setHasPaymentAttempt(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("bookings")
        .select(
          `
          id,
          status,
          payment_status,
          payment_offer_expires_at
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "game_id",
          Number(game.id)
        )
        .maybeSingle();

      if (error) {
        console.log(
          "Booking check error:",
          error.message
        );

        return;
      }

      if (!data?.id) {
        setBookingStatus(null);
        setBookingId(null);
        setPaymentOfferExpiresAt(
          null
        );
        setHasPaymentAttempt(false);
        return;
      }

      const currentBookingId =
        Number(data.id);

      setBookingId(
        currentBookingId
      );

      setPaymentOfferExpiresAt(
        data.payment_offer_expires_at ??
        null
      );

      if (
        data.status === "confirmed"
      ) {
        setBookingStatus(
          "confirmed"
        );
      } else if (
        data.status === "waitlisted"
      ) {
        setBookingStatus(
          "waitlisted"
        );
      } else if (
        data.status ===
        "pending_payment"
      ) {
        setBookingStatus(
          "pending_payment"
        );
      } else {
        setBookingStatus(null);
      }

      // We need to distinguish:
      //
      // 1. A fresh waitlist offer that has
      //    NOT started Telebirr yet.
      //
      // 2. A payment that was already
      //    created and should be checked.
      //
      // Look for an existing Chapa
      // payment for this booking.
      if (
        data.status ===
        "pending_payment"
      ) {
        const {
          data: existingPayments,
          error:
          existingPaymentError,
        } = await supabase
          .from("payments")
          .select(
            "id, status, created_at"
          )
          .eq(
            "booking_id",
            currentBookingId
          )
          .eq(
            "provider",
            "chapa"
          )
          .in("status", [
            "pending",
            "paid",
          ])
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(1);

        if (
          existingPaymentError
        ) {
          console.log(
            "Payment attempt check error:",
            existingPaymentError.message
          );

          // Safer fallback:
          // don't accidentally start
          // another payment.
          setHasPaymentAttempt(
            true
          );
        } else {
          setHasPaymentAttempt(
            !!existingPayments?.length
          );
        }
      } else {
        setHasPaymentAttempt(
          false
        );
      }
    }

    checkBooking();
  }, [game.id]);

  async function handleJoinGame() {
    if (joining) {
      return;
    }

    setPaymentMessage(null);

    // ---------------------------------
    // PAID WAITLIST OFFER
    // ---------------------------------

    if (isPaidWaitlistOffer) {
      if (isOfferExpired) {
        setPaymentMessage(
          t("gameCard.paymentOfferExpired")
        );

        return;
      }

      if (
        !hasPaymentAttempt
      ) {
        await handleTelebirrPayment(
          true
        );

        return;
      }

      await handleCheckPayment();
      return;
    }

    // ---------------------------------
    // NORMAL PENDING PAYMENT
    // ---------------------------------

    if (isPendingPayment) {
      await handleCheckPayment();
      return;
    }

    // Confirmed/waitlisted bookings
    // are not actionable here.
    if (bookingStatus) {
      return;
    }

    // Full games use the normal
    // waitlist RPC.
    if (isFull) {
      await handleNormalJoin();
      return;
    }

    // Free game.
    if (!isPaidGame) {
      await handleNormalJoin();
      return;
    }

    // Paid game with available spot.
    await handleTelebirrPayment(
      false
    );
  }

  async function handleNormalJoin() {
    setJoining(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        console.log(
          "User is not logged in:",
          userError?.message
        );

        setPaymentMessage(
          t("gameCard.signInFirst")
        );

        return;
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "join_game",
        {
          p_game_id:
            Number(game.id),
        }
      );

      if (error) {
        console.log(
          "Join game error:",
          error.message
        );

        setPaymentMessage(
          error.message
        );

        return;
      }

      console.log(
        "Join game result:",
        data
      );

      if (
        data?.booking_id
      ) {
        setBookingId(
          Number(
            data.booking_id
          )
        );
      }

      if (
        data?.booking_status ===
        "confirmed"
      ) {
        setBookingStatus(
          "confirmed"
        );
      }

      if (
        data?.booking_status ===
        "waitlisted"
      ) {
        setBookingStatus(
          "waitlisted"
        );

        setPaymentMessage(null);
      }

      if (
        data &&
        typeof data.spots_left ===
        "number"
      ) {
        setSpotsLeft(
          Number(
            data.spots_left
          )
        );
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleCheckPayment() {
    if (joining) {
      return;
    }

    if (!bookingId) {
      setPaymentMessage(
        t("gameCard.paymentBookingNotFound")
      );

      return;
    }

    setJoining(true);

    setPaymentMessage(
      t("gameCard.checkingTelebirrPayment")
    );

    try {
      const {
        data: verifyData,
        error: verifyError,
      } =
        await supabase.functions.invoke(
          "verify-chapa-payment",
          {
            body: {
              booking_id:
                bookingId,
            },
          }
        );

      if (verifyError) {
        console.log(
          "Check payment error:",
          verifyError
        );

        setPaymentMessage(
          t("gameCard.paymentVerifyError")
        );

        return;
      }

      console.log(
        "Check payment result:",
        verifyData
      );

      if (
        verifyData?.paid ===
        true &&
        verifyData?.status ===
        "paid"
      ) {
        setBookingStatus(
          "confirmed"
        );

        setPaymentOfferExpiresAt(
          null
        );

        setHasPaymentAttempt(
          false
        );

        setPaymentMessage(
          t("gameCard.paymentSuccessfulShort")
        );

        return;
      }

      if (
        verifyData?.status ===
        "refund_pending"
      ) {
        setBookingStatus(null);
        setBookingId(null);

        setPaymentOfferExpiresAt(
          null
        );

        setHasPaymentAttempt(
          false
        );

        setPaymentMessage(
          t("gameCard.refundPending")
        );

        return;
      }

      if (
        verifyData?.status ===
        "expired"
      ) {
        if (
          isPaidWaitlistOffer
        ) {
          setPaymentMessage(
            t("gameCard.waitlistOfferReleased")
          );

          return;
        }

        setBookingStatus(null);
        setBookingId(null);

        setPaymentOfferExpiresAt(
          null
        );

        setHasPaymentAttempt(
          false
        );

        if (
          typeof verifyData.spots_left ===
          "number"
        ) {
          setSpotsLeft(
            Number(
              verifyData.spots_left
            )
          );
        } else {
          setSpotsLeft(
            (current) =>
              current + 1
          );
        }

        setPaymentMessage(
          t("gameCard.reservedSpotReleased")
        );

        return;
      }

      if (
        verifyData?.status ===
        "failed"
      ) {
        if (
          isPaidWaitlistOffer
        ) {
          setHasPaymentAttempt(
            false
          );

          setPaymentMessage(
            t("gameCard.waitlistPaymentFailed")
          );

          return;
        }

        setBookingStatus(null);
        setBookingId(null);

        setPaymentOfferExpiresAt(
          null
        );

        setHasPaymentAttempt(
          false
        );

        setPaymentMessage(
          t("gameCard.paymentFailed")
        );

        return;
      }

      setPaymentMessage(
        t("gameCard.paymentStillPending")
      );
    } catch (error) {
      console.log(
        "Check payment error:",
        error
      );

      setPaymentMessage(
        t("gameCard.paymentVerifyError")
      );
    } finally {
      setJoining(false);
    }
  }

  async function handleTelebirrPayment(
    fromWaitlistOffer: boolean
  ) {
    if (
      fromWaitlistOffer &&
      !bookingId
    ) {
      setPaymentMessage(
        t("gameCard.waitlistBookingNotFound")
      );

      return;
    }

    if (
      fromWaitlistOffer &&
      isOfferExpired
    ) {
      setPaymentMessage(
        t("gameCard.waitlistPaymentExpired")
      );

      return;
    }

    setJoining(true);

    setPaymentMessage(
      fromWaitlistOffer
        ? t("gameCard.startingWaitlistPayment")
        : t("gameCard.startingPayment")
    );

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        setPaymentMessage(
          t("gameCard.signInFirst")
        );

        return;
      }

      // ---------------------------------
      // CREATE CHAPA PAYMENT
      //
      // Normal paid game:
      //   { game_id }
      //
      // Paid waitlist offer:
      //   { game_id, booking_id }
      //
      // The waitlist booking already owns
      // the newly available spot.
      // ---------------------------------

      const requestBody =
        fromWaitlistOffer
          ? {
            game_id:
              Number(game.id),
            booking_id:
              bookingId,
          }
          : {
            game_id:
              Number(game.id),
          };

      const {
        data: paymentData,
        error: paymentError,
      } =
        await supabase.functions.invoke(
          "create-chapa-payment",
          {
            body:
              requestBody,
          }
        );

      if (paymentError) {
        console.log(
          "Create payment error:",
          paymentError
        );

        setPaymentMessage(
          paymentData?.error ||
          t("gameCard.paymentCouldNotStart")
        );

        return;
      }

      if (
        !paymentData?.success
      ) {
        setPaymentMessage(
          paymentData?.error ||
          t("gameCard.paymentCouldNotStart")
        );

        return;
      }

      const paymentId =
        Number(
          paymentData.payment_id
        );

      const newBookingId =
        Number(
          paymentData.booking_id
        );

      if (
        !Number.isInteger(
          paymentId
        ) ||
        paymentId <= 0
      ) {
        setPaymentMessage(
          t("gameCard.paymentReferenceMissing")
        );

        return;
      }

      if (
        Number.isInteger(
          newBookingId
        ) &&
        newBookingId > 0
      ) {
        setBookingId(
          newBookingId
        );
      }

      setBookingStatus(
        "pending_payment"
      );

      setHasPaymentAttempt(
        true
      );

      // A normal paid reservation reserves
      // a new seat now.
      //
      // A waitlist offer ALREADY reserved
      // its seat when the offer was created,
      // so never decrement again here.
      if (
        typeof paymentData.spots_left ===
        "number"
      ) {
        setSpotsLeft(
          Number(
            paymentData.spots_left
          )
        );
      } else if (
        !fromWaitlistOffer
      ) {
        setSpotsLeft(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );
      }

      setPaymentMessage(
        t("gameCard.paymentRequestSent")
      );

      // ---------------------------------
      // VERIFY PAYMENT
      // ---------------------------------

      const maxAttempts = 6;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        if (attempt > 1) {
          await sleep(2000);
        }

        const {
          data: verifyData,
          error: verifyError,
        } =
          await supabase.functions.invoke(
            "verify-chapa-payment",
            {
              body: {
                payment_id:
                  paymentId,
              },
            }
          );

        if (verifyError) {
          console.log(
            "Verify payment error:",
            verifyError
          );

          if (
            attempt ===
            maxAttempts
          ) {
            setPaymentMessage(
              t("gameCard.paymentStillVerifying")
            );
          }

          continue;
        }

        if (
          verifyData?.paid ===
          true &&
          verifyData?.status ===
          "paid"
        ) {
          setBookingStatus(
            "confirmed"
          );

          setPaymentOfferExpiresAt(
            null
          );

          setHasPaymentAttempt(
            false
          );

          setPaymentMessage(
            t("gameCard.paymentSuccessfulShort")
          );

          return;
        }

        if (
          verifyData?.status ===
          "refund_pending"
        ) {
          setBookingStatus(
            null
          );

          setBookingId(null);

          setPaymentOfferExpiresAt(
            null
          );

          setHasPaymentAttempt(
            false
          );

          setPaymentMessage(
            t("gameCard.refundPending")
          );

          return;
        }

        if (
          verifyData?.status ===
          "expired"
        ) {
          if (
            fromWaitlistOffer
          ) {
            setPaymentMessage(
              t("gameCard.waitlistOfferReleased")
            );

            return;
          }

          setBookingStatus(
            null
          );

          setBookingId(null);

          setPaymentOfferExpiresAt(
            null
          );

          setHasPaymentAttempt(
            false
          );

          if (
            typeof verifyData.spots_left ===
            "number"
          ) {
            setSpotsLeft(
              Number(
                verifyData.spots_left
              )
            );
          } else {
            setSpotsLeft(
              (current) =>
                current + 1
            );
          }

          setPaymentMessage(
            t("gameCard.reservedSpotReleased")
          );

          return;
        }

        if (
          verifyData?.status ===
          "failed"
        ) {
          if (
            fromWaitlistOffer &&
            !isOfferExpired
          ) {
            setHasPaymentAttempt(
              false
            );

            setPaymentMessage(
              t("gameCard.waitlistPaymentFailed")
            );

            return;
          }

          if (
            fromWaitlistOffer
          ) {
            setPaymentMessage(
              t("gameCard.waitlistPaymentExpired")
            );

            return;
          }

          setBookingStatus(
            null
          );

          setBookingId(null);

          setPaymentOfferExpiresAt(
            null
          );

          setHasPaymentAttempt(
            false
          );

          setPaymentMessage(
            t("gameCard.paymentFailed")
          );

          return;
        }

        setPaymentMessage(
          t("gameCard.waitingForPayment")
        );
      }

      setPaymentMessage(
        t("gameCard.paymentStillPending")
      );
    } catch (error) {
      console.log(
        "Telebirr payment error:",
        error
      );

      setPaymentMessage(
        t("gameCard.paymentStartError")
      );
    } finally {
      setJoining(false);
    }
  }

  function getButtonText() {
    if (joining) {
      if (canPayWaitlistOffer) {
        return t("gameCard.connectingTelebirr");
      }

      if (isPendingPayment) {
        return t("gameCard.checkingPayment");
      }

      if (isFull) {
        return t("gameCard.joiningWaitlist");
      }

      if (isPaidGame) {
        return t("gameCard.connectingTelebirr");
      }

      return t("gameCard.joining");
    }

    if (isConfirmed) {
      return t("gameCard.joined");
    }

    if (isWaitlisted) {
      return t("gameCard.waitlisted");
    }

    if (canPayWaitlistOffer) {
      return `${price} ETB • ${t(
        "gameCard.payWithTelebirr"
      )}`;
    }

    if (
      isPaidWaitlistOffer &&
      isOfferExpired
    ) {
      return t("gameCard.offerExpired");
    }

    if (isPendingPayment) {
      return t("gameCard.checkPayment");
    }

    if (isFull) {
      return t("gameCard.joinWaitlist");
    }

    if (isPaidGame) {
      return `${price} ETB • ${t(
        "gameCard.payWithTelebirr"
      )}`;
    }

    return t("gameCard.joinGame");
  }

  const actionDisabled =
    joining ||
    isConfirmed ||
    isWaitlisted ||
    isOfferExpired;

  return (
    <View style={styles.card}>
      {/* FIELD IMAGE */}

      <View
        style={
          styles.imageContainer
        }
      >
        <Image
          source={
            typeof game.image ===
              "string"
              ? {
                uri: game.image,
              }
              : game.image
          }
          style={styles.image}
          resizeMode="cover"
        />

        {/* GAME STATUS */}

        <View
          style={[
            styles.statusBadge,
            isFull
              ? styles.fullBadge
              : styles.confirmedBadge,
          ]}
        >
          <Ionicons
            name={
              isFull
                ? "alert-circle"
                : "checkmark-circle"
            }
            size={17}
            color={
              isFull
                ? "#FFFFFF"
                : "#71E49A"
            }
          />

          <Text
            style={[
              styles.statusText,
              isFull &&
              styles.fullStatusText,
            ]}
          >
            {isFull
              ? t("gameCard.gameFull")
              : t("gameCard.confirmed")}
          </Text>
        </View>

        {/* FAVORITE */}

        <Pressable
          style={styles.favorite}
        >
          <Ionicons
            name="heart-outline"
            size={30}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* GAME INFORMATION */}

      <View style={styles.content}>
        <Text style={styles.title}>
          {game.title}
        </Text>

        <Text
          style={styles.organizer}
        >
          {t("gameCard.by")} {game.organizer}
        </Text>

        <View
          style={styles.locationRow}
        >
          <Ionicons
            name="location-outline"
            size={17}
            color={
              c.textSecondary
            }
          />

          <Text
            style={
              styles.locationText
            }
          >
            {game.area}

            {game.distance
              ? ` • ${game.distance}`
              : ""}
          </Text>
        </View>

        <View
          style={styles.detailsRow}
        >
          <View
            style={styles.skillBadge}
          >
            <Text
              style={styles.skillText}
            >
              {getSkillLabel(game.skill)}
            </Text>
          </View>

          <Text
            style={
              isFull
                ? styles.fullText
                : styles.spotsText
            }
          >
            {isFull
              ? t("gameCard.gameFull")
              : `${spotsLeft} ${t("gameCard.spotsLeft")}`}
          </Text>
        </View>

        <View
          style={styles.bottomRow}
        >
          <View
            style={styles.timeRow}
          >
            <Ionicons
              name="calendar-outline"
              size={19}
              color="#D7E1DC"
            />

            <Text
              style={styles.time}
            >
              {game.time} •{" "}
              {game.format}
            </Text>
          </View>

          <Text
            style={styles.price}
          >
            {price === 0
              ? t("gameCard.free")
              : `${price} ETB`}
          </Text>
        </View>

        {/* PAID WAITLIST OFFER */}

        {isPaidWaitlistOffer && (
          <View
            style={[
              styles.offerCard,
              isOfferExpired &&
              styles.expiredOfferCard,
            ]}
          >
            <View
              style={
                styles.offerHeader
              }
            >
              <View
                style={
                  styles.offerTitleRow
                }
              >
                <Ionicons
                  name={
                    isOfferExpired
                      ? "time-outline"
                      : "football-outline"
                  }
                  size={22}
                  color={
                    isOfferExpired
                      ? "#FF9A9E"
                      : "#71E49A"
                  }
                />

                <Text
                  style={[
                    styles.offerTitle,
                    isOfferExpired &&
                    styles.expiredOfferTitle,
                  ]}
                >
                  {isOfferExpired
                    ? t("gameCard.offerExpired")
                    : t("gameCard.spotOpened")}
                </Text>
              </View>

              {!isOfferExpired && (
                <View
                  style={
                    styles.countdownBadge
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color="#F6C85F"
                  />

                  <Text
                    style={
                      styles.countdownText
                    }
                  >
                    {waitlistCountdown}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={
                styles.offerDescription
              }
            >
              {isOfferExpired
                ? t("gameCard.offerExpiredDescription")
                : hasPaymentAttempt
                  ? t("gameCard.reservedDescription")
                  : `${price} ETB • ${t(
                    "gameCard.payWithTelebirr"
                  )}`}
            </Text>
          </View>
        )}

        {/* NORMAL WAITLIST MESSAGE */}

        {isWaitlisted &&
          isPaidGame && (
            <View
              style={
                styles.waitlistNotice
              }
            >
              <Ionicons
                name="time-outline"
                size={19}
                color="#F6C85F"
              />

              <Text
                style={
                  styles.waitlistNoticeText
                }
              >
                {t("gameCard.waitlistNotice")}
              </Text>
            </View>
          )}

        {/* PAYMENT MESSAGE */}

        {paymentMessage && (
          <View
            style={
              styles.paymentMessage
            }
          >
            <Ionicons
              name={
                isConfirmed
                  ? "checkmark-circle-outline"
                  : "information-circle-outline"
              }
              size={18}
              color={
                isConfirmed
                  ? "#71E49A"
                  : "#F6C85F"
              }
            />

            <Text
              style={[
                styles.paymentMessageText,
                isConfirmed &&
                styles.paymentSuccessText,
              ]}
            >
              {paymentMessage}
            </Text>
          </View>
        )}

        {/* ACTION BUTTON */}

        <Pressable
          style={[
            styles.actionButton,

            isFull &&
            !isConfirmed &&
            !isWaitlisted &&
            !isPendingPayment &&
            styles.waitlistButton,

            isConfirmed &&
            styles.joinedButton,

            isWaitlisted &&
            styles.waitlistedButton,

            isPendingPayment &&
            styles.pendingButton,

            canPayWaitlistOffer &&
            styles.offerPayButton,

            isOfferExpired &&
            styles.expiredButton,

            joining &&
            styles.disabledButton,
          ]}
          onPress={handleJoinGame}
          disabled={actionDisabled}
        >
          {isConfirmed ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#71E49A"
              />

              <Text
                style={
                  styles.joinedText
                }
              >
                {t("gameCard.joined")}
              </Text>
            </View>
          ) : isWaitlisted ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name="time-outline"
                size={20}
                color="#F6C85F"
              />

              <Text
                style={
                  styles.waitlistedText
                }
              >
                {t("gameCard.waitlisted")}
              </Text>
            </View>
          ) : canPayWaitlistOffer ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={
                  c.primaryText
                }
              />

              <Text
                style={
                  styles.actionText
                }
              >
                {joining
                  ? t("gameCard.connectingTelebirr")
                  : `${price} ETB • ${t(
                    "gameCard.payWithTelebirr"
                  )}`}
              </Text>
            </View>
          ) : isOfferExpired ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name="time-outline"
                size={20}
                color="#8D9692"
              />

              <Text
                style={
                  styles.expiredButtonText
                }
              >
                {t("gameCard.offerExpired")}
              </Text>
            </View>
          ) : isPendingPayment ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name={
                  joining
                    ? "sync-outline"
                    : "refresh-outline"
                }
                size={20}
                color="#F6C85F"
              />

              <Text
                style={
                  styles.pendingText
                }
              >
                {joining
                  ? t("gameCard.checkingPayment")
                  : t("gameCard.checkPayment")}
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.buttonContent
              }
            >
              {isPaidGame &&
                !isFull && (
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color={
                      c.primaryText
                    }
                  />
                )}

              <Text
                style={[
                  styles.actionText,
                  isFull &&
                  styles.waitlistText,
                ]}
              >
                {getButtonText()}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        c.surface,
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
      backgroundColor:
        c.successDark,
    },

    fullBadge: {
      backgroundColor:
        c.dangerDark,
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
      justifyContent:
        "center",
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
      color:
        c.textSecondary,
      fontSize: 16,
      marginTop: 3,
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 9,
    },

    locationText: {
      color:
        c.textSecondary,
      fontSize: 15,
    },

    detailsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 21,
    },

    skillBadge: {
      backgroundColor:
        c.skill,
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
      justifyContent:
        "space-between",
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

    offerCard: {
      backgroundColor:
        "#102B22",
      borderWidth: 1,
      borderColor:
        "#18C8FF",
      borderRadius: 15,
      padding: 13,
      marginBottom: 12,
    },

    expiredOfferCard: {
      backgroundColor:
        "#2B1C1E",
      borderColor:
        "#6B3439",
    },

    offerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 10,
    },

    offerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      flexShrink: 1,
    },

    offerTitle: {
      color: "#71E49A",
      fontSize: 16,
      fontWeight: "800",
    },

    expiredOfferTitle: {
      color: "#FF9A9E",
    },

    countdownBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor:
        "#2A2415",
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    countdownText: {
      color: "#F6C85F",
      fontSize: 14,
      fontWeight: "800",
      fontVariant: [
        "tabular-nums",
      ],
    },

    offerDescription: {
      color: "#D7E1DC",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 9,
    },

    waitlistNotice: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 8,
      backgroundColor:
        "#2A2415",
      borderWidth: 1,
      borderColor:
        "#5E522C",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },

    waitlistNoticeText: {
      color: "#F6C85F",
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 19,
      flex: 1,
    },

    paymentMessage: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor:
        "#2A2415",
      borderWidth: 1,
      borderColor:
        "#5E522C",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },

    paymentMessageText: {
      color: "#F6C85F",
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },

    paymentSuccessText: {
      color: "#71E49A",
    },

    actionButton: {
      height: 56,
      backgroundColor:
        c.primary,
      borderRadius: 15,
      alignItems: "center",
      justifyContent:
        "center",
    },

    actionText: {
      color:
        c.primaryText,
      fontSize: 17,
      fontWeight: "800",
    },

    waitlistButton: {
      backgroundColor:
        "transparent",
      borderWidth: 1,
      borderColor:
        c.primary,
    },

    waitlistText: {
      color: c.primary,
    },

    joinedButton: {
      backgroundColor:
        "#0B1726",
      borderWidth: 1,
      borderColor:
        "#18C8FF",
    },

    waitlistedButton: {
      backgroundColor:
        "#2A2415",
      borderWidth: 1,
      borderColor:
        "#F6C85F",
    },

    pendingButton: {
      backgroundColor:
        "#2A2415",
      borderWidth: 1,
      borderColor:
        "#F6C85F",
    },

    offerPayButton: {
      backgroundColor:
        c.primary,
      borderWidth: 0,
    },

    expiredButton: {
      backgroundColor:
        "#1D2220",
      borderWidth: 1,
      borderColor:
        "#3D4541",
    },

    buttonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    joinedText: {
      color: "#71E49A",
      fontSize: 17,
      fontWeight: "800",
    },

    waitlistedText: {
      color: "#F6C85F",
      fontSize: 17,
      fontWeight: "800",
    },

    pendingText: {
      color: "#F6C85F",
      fontSize: 17,
      fontWeight: "800",
    },

    expiredButtonText: {
      color: "#8D9692",
      fontSize: 17,
      fontWeight: "800",
    },

    disabledButton: {
      opacity: 0.65,
    },
  });