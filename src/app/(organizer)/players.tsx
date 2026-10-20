import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

type PlayerBooking = {
  id: number;
  user_id: string;
  game_id: number;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
};

type OrganizerGame = {
  id: number;
  title: string | null;
  starts_at: string | null;
  status: string | null;
  payment_method: string | null;
  payment_provider: string | null;
};

type PlayerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  skill_level: string | null;
};

type OrganizerPayment = {
  id: number;
  booking_id: number | null;
  amount: number;
  provider: string | null;
  status: string;
  player_reference: string | null;
  refund_status: string | null;
};

type PlayerRow = {
  bookingId: number;
  userId: string;
  gameId: number;

  playerName: string;
  phone: string | null;
  skillLevel: string | null;

  bookingStatus: string | null;
  paymentStatus: string | null;

  gameTitle: string;
  gameStartsAt: string | null;

  paymentMethod: string | null;
  paymentProvider: string | null;

  paymentId: number | null;
  paymentAmount: number | null;
  paymentReference: string | null;
};

type RefundRow = {
  bookingId: number;
  userId: string;
  gameId: number;

  playerName: string;
  phone: string | null;

  gameTitle: string;

  paymentId: number;
  paymentAmount: number;
  paymentProvider: string | null;
};

export default function OrganizerPlayers() {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState(true);

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);

  const [confirmingBookingId, setConfirmingBookingId] = useState<number | null>(
    null,
  );

  const [refundingPaymentId, setRefundingPaymentId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers(showFullScreenLoader = true) {
    try {
      if (showFullScreenLoader) {
        setLoading(true);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // --------------------------------
      // 1. Organizer's games
      // --------------------------------

      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select(
          `
  id,
  title,
  starts_at,
  status,
  payment_method,
  payment_provider
  `,
        )
        .eq("created_by", user.id)
        .order("starts_at", {
          ascending: false,
        });

      if (gamesError) {
        console.error("Error loading organizer games:", gamesError);
        return;
      }

      const games = (gamesData ?? []) as OrganizerGame[];

      if (games.length === 0) {
        setPlayers([]);
        setRefunds([]);
        return;
      }

      const gameIds = games.map((game) => game.id);

      const gameMap = new Map(games.map((game) => [Number(game.id), game]));

      // --------------------------------
      // 2. Active bookings
      // --------------------------------

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
            id,
            user_id,
            game_id,
            status,
            payment_status,
            created_at
            `,
        )
        .in("game_id", gameIds)
        .not("status", "in", "(cancelled_by_player,cancelled_by_organizer)")
        .order("created_at", {
          ascending: false,
        });

      if (bookingsError) {
        console.error("Error loading organizer bookings:", bookingsError);
        return;
      }

      const bookings = (bookingsData ?? []) as PlayerBooking[];

      // --------------------------------
      // 3. Refund-pending bookings
      // --------------------------------

      const { data: refundBookingsData, error: refundBookingsError } =
        await supabase
          .from("bookings")
          .select(
            `
          id,
          user_id,
          game_id,
          status,
          payment_status,
          created_at
          `,
          )
          .in("game_id", gameIds)
          .eq("status", "cancelled_by_organizer")
          .eq("payment_status", "refund_pending")
          .order("created_at", {
            ascending: false,
          });

      if (refundBookingsError) {
        console.error(
          "Error loading organizer refund bookings:",
          refundBookingsError,
        );
        return;
      }

      const refundBookings = (refundBookingsData ?? []) as PlayerBooking[];

      // --------------------------------
      // 4. Profiles
      // --------------------------------

      const allUserIds = [
        ...new Set(
          [...bookings, ...refundBookings]
            .map((booking) => booking.user_id)
            .filter(Boolean),
        ),
      ];

      let profiles: PlayerProfile[] = [];

      if (allUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              phone,
              skill_level
              `,
          )
          .in("id", allUserIds);

        if (profilesError) {
          console.error("Error loading player profiles:", profilesError);
        }

        profiles = (profilesData ?? []) as PlayerProfile[];
      }

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile]),
      );

      // --------------------------------
      // 5. Payments
      // --------------------------------

      const allBookingIds = [
        ...new Set(
          [...bookings, ...refundBookings].map((booking) => booking.id),
        ),
      ];

      let payments: OrganizerPayment[] = [];

      if (allBookingIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select(
            `
              id,
              booking_id,
              amount,
              provider,
              status,
              player_reference,
              refund_status
              `,
          )
          .in("booking_id", allBookingIds)
          .order("id", {
            ascending: false,
          });

        if (paymentsError) {
          console.error("Error loading organizer payments:", paymentsError);
        }

        payments = (paymentsData ?? []) as OrganizerPayment[];
      }

      const paymentMap = new Map<number, OrganizerPayment>();

      // Payments are newest first.
      // Keep newest payment for each booking.
      payments.forEach((payment) => {
        if (
          payment.booking_id !== null &&
          !paymentMap.has(payment.booking_id)
        ) {
          paymentMap.set(payment.booking_id, payment);
        }
      });

      // --------------------------------
      // 6. Build active player rows
      // --------------------------------

      const rows: PlayerRow[] = bookings.map((booking) => {
        const profile = profileMap.get(booking.user_id);
        const game = gameMap.get(Number(booking.game_id));
        const payment = paymentMap.get(booking.id);

        return {
          bookingId: booking.id,
          userId: booking.user_id,
          gameId: Number(booking.game_id),

          playerName:
            profile?.full_name?.trim() || t("organizerPlayers.player"),

          phone: profile?.phone ?? null,
          skillLevel: profile?.skill_level ?? null,

          bookingStatus: booking.status,
          paymentStatus: booking.payment_status,

          gameTitle: game?.title || t("organizerPlayers.footballGame"),

          gameStartsAt: game?.starts_at ?? null,

          paymentMethod: game?.payment_method ?? null,

          paymentProvider: payment?.provider ?? game?.payment_provider ?? null,

          paymentId: payment?.id ?? null,
          paymentAmount: payment?.amount ?? null,
          paymentReference: payment?.player_reference ?? null,
        };
      });

      // --------------------------------
      // 7. Build refund rows
      // --------------------------------

      const refundRows: RefundRow[] = refundBookings
        .map((booking) => {
          const profile = profileMap.get(booking.user_id);
          const game = gameMap.get(Number(booking.game_id));
          const payment = paymentMap.get(booking.id);

          if (
            !game ||
            game.status !== "cancelled" ||
            game.payment_method !== "organizer" ||
            booking.status !== "cancelled_by_organizer" ||
            booking.payment_status !== "refund_pending" ||
            !payment ||
            payment.status !== "refund_pending" ||
            payment.refund_status !== "pending"
          ) {
            return null;
          }

          return {
            bookingId: booking.id,
            userId: booking.user_id,
            gameId: Number(booking.game_id),

            playerName:
              profile?.full_name?.trim() || t("organizerPlayers.player"),

            phone: profile?.phone ?? null,

            gameTitle: game.title || t("organizerPlayers.footballGame"),

            paymentId: payment.id,
            paymentAmount: payment.amount,

            paymentProvider: payment.provider ?? game.payment_provider ?? null,
          };
        })
        .filter((row): row is RefundRow => row !== null);

      setPlayers(rows);
      setRefunds(refundRows);
    } catch (error) {
      console.error("Error loading organizer players:", error);
    } finally {
      if (showFullScreenLoader) {
        setLoading(false);
      }
    }
  }

  // --------------------------------
  // Confirm submitted payment
  // --------------------------------

  async function confirmPayment(bookingId: number) {
    if (confirmingBookingId !== null || refundingPaymentId !== null) {
      return;
    }

    try {
      setConfirmingBookingId(bookingId);

      const { data, error } = await supabase.rpc("confirm_organizer_payment", {
        p_booking_id: bookingId,
      });

      if (error) {
        console.error("Error confirming payment:", error);
        return;
      }

      console.log("Payment confirmed:", data);

      await loadPlayers(false);
    } catch (error) {
      console.error("Error confirming payment:", error);
    } finally {
      setConfirmingBookingId(null);
    }
  }

  // --------------------------------
  // Mark manual refund complete
  // --------------------------------

  function requestMarkRefunded(refund: RefundRow) {
    if (refundingPaymentId !== null || confirmingBookingId !== null) {
      return;
    }

    const message = `${t("organizerPlayers.confirmRefundMessage")}

${refund.paymentAmount} ETB${
      refund.paymentProvider ? ` · ${refund.paymentProvider}` : ""
    }`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const confirmed = window.confirm(
        `${t("organizerPlayers.confirmRefundTitle")}\n\n${message}`,
      );

      if (confirmed) {
        void markRefunded(refund.paymentId);
      }

      return;
    }

    Alert.alert(t("organizerPlayers.confirmRefundTitle"), message, [
      {
        text: t("organizerPlayers.keepPending"),
        style: "cancel",
      },
      {
        text: t("organizerPlayers.confirmRefund"),
        style: "destructive",
        onPress: () => {
          void markRefunded(refund.paymentId);
        },
      },
    ]);
  }

  async function markRefunded(paymentId: number) {
    if (refundingPaymentId !== null || confirmingBookingId !== null) {
      return;
    }

    try {
      setRefundingPaymentId(paymentId);

      const { data, error } = await supabase.rpc(
        "mark_organizer_payment_refunded",
        {
          p_payment_id: paymentId,
        },
      );

      if (error) {
        console.error("Error recording organizer refund:", error);

        showMessage(t("organizerPlayers.refundFailed"), error.message);

        return;
      }

      console.log("Organizer refund recorded:", data);

      await loadPlayers(false);
    } catch (error) {
      console.error("Error recording organizer refund:", error);

      showMessage(
        t("organizerPlayers.refundFailed"),
        error instanceof Error ? error.message : "",
      );
    } finally {
      setRefundingPaymentId(null);
    }
  }

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  // --------------------------------
  // Derived data
  // --------------------------------

  const uniquePlayers = useMemo(() => {
    return new Set(players.map((player) => player.userId)).size;
  }, [players]);

  const pendingPlayers = useMemo(() => {
    return players.filter(
      (player) =>
        player.bookingStatus === "pending_payment" &&
        player.paymentStatus === "submitted",
    );
  }, [players]);

  const confirmedPlayers = useMemo(() => {
    return players.filter(
      (player) =>
        !(
          player.bookingStatus === "pending_payment" &&
          player.paymentStatus === "submitted"
        ),
    );
  }, [players]);

  function formatDate(value: string | null) {
    if (!value) {
      return t("organizerPlayers.dateNotSet");
    }

    const locale =
      language === "am" ? "am-ET" : language === "om" ? "om-ET" : "en-US";

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  }

  function getInitial(name: string) {
    const trimmed = name.trim();

    if (!trimmed) {
      return "P";
    }

    return trimmed.charAt(0).toUpperCase();
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
          },
        ]}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{t("organizerPlayers.eyebrow")}</Text>

            <Text style={styles.title}>{t("organizerPlayers.title")}</Text>

            <Text style={styles.subtitle}>
              {t("organizerPlayers.subtitle")}
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="people" size={25} color={COLORS.primary} />
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{uniquePlayers}</Text>

            <Text style={styles.summaryLabel}>
              {t("organizerPlayers.totalPlayers")}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                pendingPlayers.length > 0 && styles.attentionNumber,
              ]}
            >
              {pendingPlayers.length}
            </Text>

            <Text style={styles.summaryLabel}>
              {t("organizerPlayers.needAction")}
            </Text>
          </View>
        </View>

        {/* PAYMENTS TO CONFIRM */}

        <View style={styles.prioritySection}>
          <View style={styles.priorityHeader}>
            <View style={styles.priorityHeaderLeft}>
              <View style={styles.priorityHeaderIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={19}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.priorityTitle}>
                {t("organizerPlayers.paymentsToConfirm")}
              </Text>
            </View>

            <View style={styles.priorityCount}>
              <Text style={styles.priorityCountText}>
                {pendingPlayers.length}
              </Text>
            </View>
          </View>

          {pendingPlayers.length === 0 ? (
            <View style={styles.allCaughtUpCard}>
              <View style={styles.allCaughtUpIcon}>
                <Ionicons name="checkmark" size={18} color="#07131D" />
              </View>

              <View style={styles.allCaughtUpCopy}>
                <Text style={styles.allCaughtUpTitle}>
                  {t("organizerPlayers.noPaymentsToConfirm")}
                </Text>

                <Text style={styles.allCaughtUpText}>
                  {t("organizerPlayers.noPaymentsToConfirmDescription")}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.priorityList}>
              {pendingPlayers.map((player) => {
                const confirming = confirmingBookingId === player.bookingId;

                return (
                  <View key={player.bookingId} style={styles.priorityCard}>
                    <View style={styles.priorityPlayerTop}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {getInitial(player.playerName)}
                        </Text>
                      </View>

                      <View style={styles.priorityPlayerInfo}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.playerName}
                        </Text>

                        <Text
                          style={styles.priorityGameTitle}
                          numberOfLines={1}
                        >
                          {player.gameTitle}
                        </Text>

                        <View style={styles.dateRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="#78909C"
                          />

                          <Text style={styles.gameDate}>
                            {formatDate(player.gameStartsAt)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.pendingBadge}>
                        <View style={styles.pendingDot} />

                        <Text style={styles.pendingBadgeText}>
                          {t("organizerPlayers.pending")}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priorityDivider} />

                    <View style={styles.paymentHeader}>
                      <View style={styles.paymentIcon}>
                        <Ionicons
                          name="wallet-outline"
                          size={19}
                          color="#F5B942"
                        />
                      </View>

                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentAmount}>
                          {player.paymentAmount ?? 0} ETB
                          {player.paymentProvider
                            ? ` · ${player.paymentProvider}`
                            : ""}
                        </Text>

                        {player.phone && (
                          <View style={styles.inlinePhoneRow}>
                            <Ionicons
                              name="call-outline"
                              size={14}
                              color="#8196A2"
                            />

                            <Text style={styles.inlinePhoneText}>
                              {player.phone}
                            </Text>
                          </View>
                        )}

                        {player.paymentReference && (
                          <Text
                            style={styles.paymentReference}
                            numberOfLines={1}
                          >
                            {t("organizerPlayers.reference")}:{" "}
                            {player.paymentReference}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Pressable
                      disabled={
                        confirmingBookingId !== null ||
                        refundingPaymentId !== null
                      }
                      onPress={() => confirmPayment(player.bookingId)}
                      style={({ pressed }) => [
                        styles.confirmButton,
                        pressed && styles.confirmButtonPressed,
                        (confirmingBookingId !== null ||
                          refundingPaymentId !== null) &&
                          styles.confirmButtonDisabled,
                      ]}
                    >
                      {confirming ? (
                        <ActivityIndicator size="small" color="#07131D" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#07131D"
                          />

                          <Text style={styles.confirmButtonText}>
                            {t("organizerPlayers.confirmPayment")}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* CONFIRMED PLAYERS */}

        <View style={styles.secondarySection}>
          <View style={styles.secondaryHeader}>
            <View style={styles.secondaryHeaderLeft}>
              <View style={styles.confirmedSectionIcon}>
                <Ionicons name="checkmark" size={17} color="#07131D" />
              </View>

              <Text style={styles.secondaryTitle}>
                {t("organizerPlayers.confirmedPlayers")}
              </Text>
            </View>

            <Text style={styles.secondaryCount}>{confirmedPlayers.length}</Text>
          </View>

          {confirmedPlayers.length === 0 ? (
            <View style={styles.compactEmptyCard}>
              <Text style={styles.compactEmptyText}>
                {t("organizerPlayers.noConfirmedPlayers")}
              </Text>
            </View>
          ) : (
            <View style={styles.confirmedList}>
              {confirmedPlayers.map((player) => (
                <View key={player.bookingId} style={styles.confirmedPlayerCard}>
                  <View style={styles.compactAvatar}>
                    <Text style={styles.compactAvatarText}>
                      {getInitial(player.playerName)}
                    </Text>
                  </View>

                  <View style={styles.confirmedPlayerInfo}>
                    <Text style={styles.confirmedPlayerName} numberOfLines={1}>
                      {player.playerName}
                    </Text>

                    <Text style={styles.confirmedGameTitle} numberOfLines={1}>
                      {player.gameTitle}
                    </Text>

                    <View style={styles.compactDateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="#708894"
                      />

                      <Text style={styles.compactDateText}>
                        {formatDate(player.gameStartsAt)}
                      </Text>
                    </View>

                    {player.phone && (
                      <View style={styles.compactPhoneRow}>
                        <Ionicons
                          name="call-outline"
                          size={13}
                          color="#708894"
                        />

                        <Text style={styles.compactPhoneText}>
                          {player.phone}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.confirmedBadge}>
                    <View style={styles.confirmedDot} />

                    <Text style={styles.confirmedText}>
                      {player.bookingStatus === "waitlisted"
                        ? t("organizerPlayers.waitlist")
                        : t("organizerPlayers.booked")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* REFUNDS */}

        <View style={styles.refundSection}>
          <View style={styles.secondaryHeader}>
            <View style={styles.secondaryHeaderLeft}>
              <View style={styles.refundSectionIcon}>
                <Ionicons
                  name="return-down-back-outline"
                  size={19}
                  color="#F5B942"
                />
              </View>

              <Text style={styles.secondaryTitle}>
                {t("organizerPlayers.refunds")}
              </Text>

              {refunds.length > 0 && (
                <View style={styles.refundCountBadge}>
                  <Text style={styles.refundCountText}>{refunds.length}</Text>
                </View>
              )}
            </View>

            {refunds.length > 0 && (
              <Text style={styles.refundPendingSummary}>
                {t("organizerPlayers.pending")}
              </Text>
            )}
          </View>

          {refunds.length === 0 ? (
            <View style={styles.refundEmptyCard}>
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#65DDA5"
              />

              <Text style={styles.refundEmptyText}>
                {t("organizerPlayers.noPendingRefunds")}
              </Text>
            </View>
          ) : (
            <View style={styles.refundList}>
              {refunds.map((refund) => {
                const refunding = refundingPaymentId === refund.paymentId;

                return (
                  <View key={refund.paymentId} style={styles.refundCard}>
                    <View style={styles.refundCompactTop}>
                      <View style={styles.refundAvatar}>
                        <Text style={styles.refundAvatarText}>
                          {getInitial(refund.playerName)}
                        </Text>
                      </View>

                      <View style={styles.refundInfo}>
                        <Text style={styles.refundPlayerName} numberOfLines={1}>
                          {refund.playerName}
                        </Text>

                        <Text style={styles.refundGameTitle} numberOfLines={1}>
                          {refund.gameTitle}
                        </Text>

                        <Text style={styles.refundCompactAmount}>
                          {refund.paymentAmount} ETB
                          {refund.paymentProvider
                            ? ` · ${refund.paymentProvider}`
                            : ""}
                        </Text>

                        {refund.phone && (
                          <View style={styles.refundPhoneRow}>
                            <Ionicons
                              name="call-outline"
                              size={13}
                              color="#8196A2"
                            />

                            <Text style={styles.refundPhoneText}>
                              {refund.phone}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.refundPendingBadge}>
                        <View style={styles.refundPendingDot} />

                        <Text style={styles.refundPendingText}>
                          {t("organizerPlayers.pending")}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      disabled={
                        refundingPaymentId !== null ||
                        confirmingBookingId !== null
                      }
                      onPress={() => void markRefunded(refund.paymentId)}
                      style={({ pressed }) => [
                        styles.refundButton,
                        pressed && styles.refundButtonPressed,
                        (refundingPaymentId !== null ||
                          confirmingBookingId !== null) &&
                          styles.refundButtonDisabled,
                      ]}
                    >
                      {refunding ? (
                        <ActivityIndicator size="small" color="#F5B942" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={17}
                            color="#F5B942"
                          />

                          <Text style={styles.refundButtonText}>
                            {t("organizerPlayers.markAsRefunded")}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* REFRESH */}

        {(players.length > 0 || refunds.length > 0) && (
          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
            ]}
            onPress={() => loadPlayers()}
          >
            <Ionicons name="refresh" size={18} color={COLORS.primary} />

            <Text style={styles.refreshText}>
              {t("organizerPlayers.refreshPlayers")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07131D",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#07131D",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 38,
  },

  // Header

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },

  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 5,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  subtitle: {
    color: "#8EA2AF",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#0E2632",
    borderWidth: 1,
    borderColor: "#173B49",
    alignItems: "center",
    justifyContent: "center",
  },

  // Summary

  summaryCard: {
    minHeight: 96,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#183844",
    backgroundColor: "#0D202B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 27,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },

  attentionNumber: {
    color: "#F5B942",
  },

  summaryLabel: {
    color: "#8398A3",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 46,
    backgroundColor: "#1B3A47",
  },

  // Payments to confirm

  prioritySection: {
    marginBottom: 29,
  },

  priorityHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  priorityHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  priorityHeaderIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#0D2733",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  priorityTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.15,
    flexShrink: 1,
  },

  priorityCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5B942",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginLeft: 12,
  },

  priorityCountText: {
    color: "#07131D",
    fontSize: 13,
    fontWeight: "900",
  },

  priorityList: {
    gap: 13,
  },

  priorityCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1B4655",
    backgroundColor: "#0D202B",
    padding: 15,
  },

  priorityPlayerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#07131D",
    fontSize: 20,
    fontWeight: "900",
  },

  priorityPlayerInfo: {
    flex: 1,
    minWidth: 0,
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  priorityGameTitle: {
    color: "#A8B8C0",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  gameDate: {
    color: "#728894",
    fontSize: 11,
    fontWeight: "500",
  },

  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#302817",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    marginLeft: 8,
  },

  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F5B942",
    marginRight: 6,
  },

  pendingBadgeText: {
    color: "#F5C65D",
    fontSize: 10,
    fontWeight: "800",
  },

  priorityDivider: {
    height: 1,
    backgroundColor: "#183844",
    marginVertical: 13,
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#302817",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  paymentInfo: {
    flex: 1,
    minWidth: 0,
  },

  paymentAmount: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  inlinePhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },

  inlinePhoneText: {
    color: "#91A3AD",
    fontSize: 11,
    fontWeight: "600",
  },

  paymentReference: {
    color: "#8196A2",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  confirmButton: {
    minHeight: 49,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  confirmButtonPressed: {
    opacity: 0.86,
  },

  confirmButtonDisabled: {
    opacity: 0.65,
  },

  confirmButtonText: {
    color: "#07131D",
    fontSize: 14,
    fontWeight: "900",
  },

  // No pending payments

  allCaughtUpCard: {
    minHeight: 78,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#173B38",
    backgroundColor: "#0D2225",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  allCaughtUpIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#39D98A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  allCaughtUpCopy: {
    flex: 1,
  },

  allCaughtUpTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  allCaughtUpText: {
    color: "#8196A2",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  // Confirmed players

  secondarySection: {
    marginBottom: 28,
  },

  secondaryHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  secondaryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  secondaryTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.15,
  },

  secondaryCount: {
    color: "#8EA2AF",
    fontSize: 12,
    fontWeight: "900",
  },

  confirmedSectionIcon: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#39D98A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  confirmedList: {
    gap: 9,
  },

  confirmedPlayerCard: {
    minHeight: 84,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#183844",
    backgroundColor: "#0D202B",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  compactAvatar: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  compactAvatarText: {
    color: "#07131D",
    fontSize: 17,
    fontWeight: "900",
  },

  confirmedPlayerInfo: {
    flex: 1,
    minWidth: 0,
  },

  confirmedPlayerName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  confirmedGameTitle: {
    color: "#8EA2AF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  compactDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },

  compactDateText: {
    color: "#708894",
    fontSize: 10,
    fontWeight: "500",
  },

  compactPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },

  compactPhoneText: {
    color: "#7F929C",
    fontSize: 10,
    fontWeight: "600",
  },

  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102A26",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },

  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#39D98A",
    marginRight: 5,
  },

  confirmedText: {
    color: "#65DDA5",
    fontSize: 10,
    fontWeight: "800",
  },

  compactEmptyCard: {
    minHeight: 58,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#183844",
    backgroundColor: "#0D202B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  compactEmptyText: {
    color: "#8196A2",
    fontSize: 12,
    fontWeight: "600",
  },

  // Refunds

  refundSection: {
    marginBottom: 8,
  },

  refundSectionIcon: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#302817",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  refundCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#302817",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },

  refundCountText: {
    color: "#F5C65D",
    fontSize: 11,
    fontWeight: "900",
  },

  refundPendingSummary: {
    color: "#9A7C3E",
    fontSize: 10,
    fontWeight: "800",
  },

  refundList: {
    gap: 9,
  },

  refundCard: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#3C351F",
    backgroundColor: "#111C20",
    padding: 13,
  },

  refundCompactTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  refundAvatar: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#302817",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  refundAvatarText: {
    color: "#F5B942",
    fontSize: 17,
    fontWeight: "900",
  },

  refundInfo: {
    flex: 1,
    minWidth: 0,
  },

  refundPlayerName: {
    color: "#E7ECEF",
    fontSize: 14,
    fontWeight: "800",
  },

  refundGameTitle: {
    color: "#8196A2",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  refundCompactAmount: {
    color: "#AAB8BE",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },

  refundPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },

  refundPhoneText: {
    color: "#8196A2",
    fontSize: 10,
    fontWeight: "600",
  },

  refundPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#302817",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },

  refundPendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F5B942",
    marginRight: 5,
  },

  refundPendingText: {
    color: "#F5C65D",
    fontSize: 9,
    fontWeight: "800",
  },

  refundButton: {
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#6A5323",
    backgroundColor: "#1E211A",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  refundButtonPressed: {
    opacity: 0.82,
  },

  refundButtonDisabled: {
    opacity: 0.55,
  },

  refundButtonText: {
    color: "#F5B942",
    fontSize: 12,
    fontWeight: "800",
  },

  refundEmptyCard: {
    minHeight: 58,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#173B38",
    backgroundColor: "#0E2424",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },

  refundEmptyText: {
    color: "#65DDA5",
    fontSize: 12,
    fontWeight: "700",
  },

  // Refresh

  refreshButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1B4655",
    backgroundColor: "#0D202B",
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  refreshButtonPressed: {
    opacity: 0.8,
  },

  refreshText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
