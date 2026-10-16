import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect } from "expo-router";

import { useCallback, useMemo, useState } from "react";
import { Calendar } from "react-native-calendars";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import ConfirmModal from "../../components/ConfirmModal";

import { COLORS } from "../../constants/colors";

import { useLanguage } from "../../i18n/LanguageContext";

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
  | "submitted"
  | "paid"
  | "failed"
  | "refund_pending"
  | "refunded"
  | null;

type PaymentMethod = "free" | "venue" | "organizer";

type Game = {
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

  payment_method: PaymentMethod;

  payment_provider: string | null;

  payment_phone: string | null;

  payment_account_name: string | null;
};

type Booking = {
  id: number;

  status: BookingStatus;

  price_paid: number | null;

  payment_status: PaymentStatus;

  payment_offer_expires_at: string | null;

  created_at: string;

  games: Game | null;
};

export default function BookingsScreen() {
  const { language, t } = useLanguage();

  const { width } = useWindowDimensions();

  const isDesktopWeb = Platform.OS === "web" && width >= 900;

  const dateLocale =
    language === "om" ? "om-ET-u-ca-gregory" : "en-US-u-ca-gregory";

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, []),
  );

  async function fetchBookings() {
    setLoading(true);

    try {
      const {
        data: { user },

        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log("Booking user error:", userError?.message || "No user");

        setBookings([]);

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

            status,

            payment_method,

            payment_provider,

            payment_phone,

            payment_account_name

          )

        `,
        )

        .eq("user_id", user.id)

        .order("created_at", { ascending: false });

      if (error) {
        console.log("Bookings error:", error.message);

        setBookings([]);

        return;
      }

      setBookings((data || []) as unknown as Booking[]);
    } finally {
      setLoading(false);
    }
  }

  const visibleBookings = useMemo(() => {
    const now = Date.now();
    const cleanSearch = search.trim().toLowerCase();

    const filtered = bookings.filter((booking) => {
      const game = booking.games;

      if (!game || !game.starts_at) {
        return false;
      }

      // Hide cancelled bookings from the main Bookings screen.
      if (
        booking.status === "cancelled_by_player" ||
        booking.status === "cancelled_by_organizer"
      ) {
        return false;
      }

      // Keep the booking visible until the game actually ends.
      const gameEndTime = game.ends_at
        ? new Date(game.ends_at).getTime()
        : new Date(game.starts_at).getTime();

      if (gameEndTime < now) {
        return false;
      }

      // Date filter.
      if (selectedDate) {
        const gameDate = getAddisDateKey(game.starts_at);

        if (gameDate !== selectedDate) {
          return false;
        }
      }

      // Search across all useful booking/game information.
      if (cleanSearch) {
        const searchableValues = [
          game.title,
          game.area,
          game.organizer,
          game.distance,
          game.time,
          game.format,
          game.skill,
          game.payment_method,
          game.payment_provider,
          game.payment_account_name,
          game.price?.toString(),
          booking.price_paid?.toString(),

          game.payment_method === "free" ? "free" : null,

          game.price != null ? `${game.price} etb` : null,
          booking.price_paid != null ? `${booking.price_paid} etb` : null,
        ];

        const matchesSearch = searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(cleanSearch),
        );

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });

    // No search: upcoming bookings nearest first.
    if (!cleanSearch) {
      return [...filtered].sort((a, b) => {
        const aTime = a.games?.starts_at
          ? new Date(a.games.starts_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        const bTime = b.games?.starts_at
          ? new Date(b.games.starts_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        return aTime - bTime;
      });
    }

    // Search: use the same relevance behavior as Discover.
    // Search: rank stronger matches first, like Discover.
    const getSearchScore = (booking: Booking) => {
      const game = booking.games;

      if (!game) {
        return 0;
      }

      const title = (game.title ?? "").toLowerCase();
      const area = (game.area ?? "").toLowerCase();
      const organizer = (game.organizer ?? "").toLowerCase();

      if (title === cleanSearch) return 100;
      if (title.startsWith(cleanSearch)) return 90;
      if (title.includes(cleanSearch)) return 80;

      if (organizer === cleanSearch) return 70;
      if (organizer.startsWith(cleanSearch)) return 65;
      if (organizer.includes(cleanSearch)) return 60;

      if (area === cleanSearch) return 50;
      if (area.startsWith(cleanSearch)) return 45;
      if (area.includes(cleanSearch)) return 40;

      return 0;
    };

    return [...filtered].sort((a, b) => {
      const scoreDifference = getSearchScore(b) - getSearchScore(a);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const aTime = a.games?.starts_at
        ? new Date(a.games.starts_at).getTime()
        : Number.MAX_SAFE_INTEGER;

      const bTime = b.games?.starts_at
        ? new Date(b.games.starts_at).getTime()
        : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    });
  }, [bookings, search, selectedDate]);

  async function submitOrganizerPayment(booking: Booking) {
    if (
      !booking.games ||
      booking.games.payment_method !== "organizer" ||
      booking.status !== "pending_payment" ||
      booking.payment_status === "submitted"
    ) {
      return;
    }

    setSubmittingId(booking.id);

    try {
      const { data, error } = await supabase.rpc("submit_organizer_payment", {
        p_booking_id: booking.id,

        p_player_reference: null,
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(t("bookings.paymentCouldNotBeSubmitted"));
      }

      await fetchBookings();
    } catch (error: any) {
      console.log("Submit organizer payment error:", error?.message || error);

      if (Platform.OS === "web") {
        window.alert(error?.message || t("bookings.couldNotSubmitPayment"));
      }
    } finally {
      setSubmittingId(null);
    }
  }

  function openCancellationModal(booking: Booking) {
    if (booking.status !== "confirmed" && booking.status !== "waitlisted") {
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
    if (!selectedBooking?.games) {
      return;
    }

    const booking = selectedBooking;

    const game = booking.games;

    if (!game) {
      return;
    }

    if (booking.status !== "confirmed" && booking.status !== "waitlisted") {
      return;
    }

    setErrorMessage(null);

    setCancellingId(booking.id);

    try {
      const { data: cancelData, error: cancelError } = await supabase.rpc(
        "cancel_booking",

        {
          p_game_id: Number(game.id),
        },
      );

      if (cancelError) {
        throw cancelError;
      }

      /*

       * IMPORTANT

       *

       * Organizer-direct payments must NEVER call the old

       * Chapa refund function.

       *

       * The player paid the organizer directly through Telebirr,

       * so any refund must be handled by the organizer.

       */

      if (
        game.payment_method !== "organizer" &&
        booking.payment_status === "paid" &&
        cancelData?.refund_required === true
      ) {
        const { error: refundError } = await supabase.functions.invoke(
          "refund-chapa-payment",

          {
            body: {
              booking_id: booking.id,
            },
          },
        );

        if (refundError) {
          console.log("Legacy refund request error:", refundError.message);
        }
      }

      setSelectedBooking(null);

      setErrorMessage(null);

      await fetchBookings();
    } catch (error: any) {
      console.log("Cancel booking error:", error?.message || error);

      setErrorMessage(error?.message || t("bookings.couldNotCancelBooking"));
    } finally {
      setCancellingId(null);
    }
  }

  const selectedIsWaitlisted = selectedBooking?.status === "waitlisted";

  const selectedIsOrganizerPaid =
    selectedBooking?.games?.payment_method === "organizer" &&
    selectedBooking?.payment_status === "paid";

  async function callOrganizer(phone: string | null) {
    if (!phone) {
      return;
    }

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (error) {
      console.log("Could not open phone dialer:", error);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}

        contentContainerStyle={[
          styles.content,

          isDesktopWeb && styles.contentDesktop,
        ]}

        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("bookings.title")}</Text>

        <Text style={styles.subtitle}>{t("bookings.subtitle")}</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={22} color={COLORS.text} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={
                language === "am"
                  ? "ቦታ፣ ጨዋታ ወይም አዘጋጅ ይፈልጉ"
                  : language === "om"
                    ? "Bakka, tapha ykn qopheessaa barbaadi"
                    : "Search your bookings"
              }
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={COLORS.primary}
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={21}
                  color={COLORS.textMuted}
                />
              </Pressable>
            )}
          </View>

          <Pressable
            style={[
              styles.filterButton,
              selectedDate && styles.filterButtonActive,
            ]}
            onPress={() => setCalendarVisible(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={25}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        {selectedDate && (
          <View style={styles.activeDateFilter}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={COLORS.primary}
            />

            <Text style={styles.activeDateFilterText}>
              {language === "am"
                ? formatEthiopianDate(`${selectedDate}T12:00:00Z`, language)
                : language === "om"
                  ? formatEthiopianDate(`${selectedDate}T12:00:00Z`, language)
                  : new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${selectedDate}T12:00:00Z`))}
            </Text>

            <Pressable onPress={() => setSelectedDate(null)}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.textMuted}
              />
            </Pressable>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />

            <Text style={styles.loadingText}>{t("bookings.loading")}</Text>
          </View>
        ) : visibleBookings.length === 0 ? (
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
            {visibleBookings.map((booking) => {
              const game = booking.games;

              if (!game) {
                return null;
              }

              const isWaitlisted = booking.status === "waitlisted";

              const isConfirmed = booking.status === "confirmed";

              const isPendingPayment = booking.status === "pending_payment";

              const cancelledByPlayer =
                booking.status === "cancelled_by_player";

              const cancelledByOrganizer =
                booking.status === "cancelled_by_organizer";

              const isCancelled = cancelledByPlayer || cancelledByOrganizer;

              const isOrganizerPayment = game.payment_method === "organizer";

              const paymentPending =
                isOrganizerPayment &&
                isPendingPayment &&
                booking.payment_status === "pending";

              const paymentSubmitted =
                isOrganizerPayment &&
                isPendingPayment &&
                booking.payment_status === "submitted";

              const paymentConfirmed =
                isOrganizerPayment &&
                isConfirmed &&
                booking.payment_status === "paid";

              const isCancelling = cancellingId === booking.id;

              const isSubmitting = submittingId === booking.id;

              const statusInfo = getStatusInfo(
                booking.status,

                booking.payment_status,

                isOrganizerPayment,

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
                    {!isCancelled && (
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
                    )}

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
                          {language === "am" || language === "om"
                            ? formatEthiopianDate(game.starts_at, language)
                            : formatAddisDate(game.starts_at, dateLocale)}
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
                        {game.payment_method === "free"
                          ? t("bookings.free")
                          : `${booking.price_paid ?? game.price} ETB`}
                      </Text>
                    </View>

                    {/* ORGANIZER PAYMENT: PAYMENT REQUIRED */}

                    {paymentPending && (
                      <View style={styles.paymentSection}>
                        <View style={styles.paymentHeader}>
                          <Ionicons
                            name="wallet-outline"

                            size={22}

                            color="#F6C85F"
                          />

                          <View style={{ flex: 1 }}>
                            <Text style={styles.paymentTitle}>
                              {t("bookings.organizerPaymentRequired")}
                            </Text>

                            <Text style={styles.paymentDescription}>
                              {t("bookings.payOrganizerToConfirm")}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.paymentAccountCard}>
                          <View style={styles.paymentAccountRow}>
                            <Text style={styles.paymentLabel}>
                              {t("bookings.method")}
                            </Text>

                            <Text style={styles.paymentValue}>
                              {game.payment_provider || "Telebirr"}
                            </Text>
                          </View>

                          <View style={styles.paymentDivider} />

                          <View style={styles.paymentAccountRow}>
                            <Text style={styles.paymentLabel}>
                              {t("bookings.phone")}
                            </Text>

                            <Text selectable style={styles.paymentValue}>
                              {game.payment_phone || "—"}
                            </Text>
                          </View>

                          <View style={styles.paymentDivider} />

                          <View style={styles.paymentAccountRow}>
                            <Text style={styles.paymentLabel}>
                              {t("bookings.accountName")}
                            </Text>

                            <Text
                              style={[
                                styles.paymentValue,

                                {
                                  flex: 1,

                                  textAlign: "right",
                                },
                              ]}
                            >
                              {game.payment_account_name || "—"}
                            </Text>
                          </View>

                          <View style={styles.paymentDivider} />

                          <View style={styles.paymentAccountRow}>
                            <Text style={styles.paymentLabel}>
                              {t("bookings.amount")}
                            </Text>

                            <Text style={styles.paymentAmount}>
                              {game.price} ETB
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.paymentInstruction}>
                          {t("bookings.sendPaymentInstruction").replace(
                            "{amount}",

                            String(game.price),
                          )}
                        </Text>

                        <Pressable
                          style={[
                            styles.paidButton,

                            isSubmitting && styles.disabledButton,
                          ]}

                          onPress={() => submitOrganizerPayment(booking)}

                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator
                              size="small"

                              color={COLORS.background}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark-circle-outline"

                                size={21}

                                color={COLORS.background}
                              />

                              <Text style={styles.paidButtonText}>
                                {t("bookings.ivePaid")}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )}

                    {/* ORGANIZER PAYMENT: SUBMITTED */}

                    {paymentSubmitted && (
                      <View style={styles.waitingPaymentNotice}>
                        <Ionicons
                          name="time-outline"

                          size={22}

                          color="#F6C85F"
                        />

                        <View style={{ flex: 1 }}>
                          <Text style={styles.waitingPaymentTitle}>
                            {t("bookings.paymentSubmitted")}
                          </Text>

                          <Text style={styles.waitingPaymentText}>
                            {t("bookings.waitingForOrganizerConfirmation")}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* ORGANIZER PAYMENT: CONFIRMED */}

                    {paymentConfirmed && (
                      <View style={styles.confirmedPaymentNotice}>
                        <Ionicons
                          name="checkmark-circle"

                          size={22}

                          color={COLORS.primary}
                        />

                        <View style={{ flex: 1 }}>
                          <Text style={styles.confirmedPaymentTitle}>
                            {t("bookings.paymentConfirmedByOrganizer")}
                          </Text>

                          <Text style={styles.confirmedPaymentText}>
                            {booking.price_paid ?? game.price} ETB •{" "}
                            {game.payment_provider || "Telebirr"}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* PAY AT VENUE */}

                    {game.payment_method === "venue" &&
                      isConfirmed &&
                      !isCancelled && (
                        <View style={styles.venueNotice}>
                          <Ionicons
                            name="location-outline"

                            size={21}

                            color={COLORS.primary}
                          />

                          <View style={{ flex: 1 }}>
                            <Text style={styles.venueTitle}>
                              {t("bookings.payAtVenue")}
                            </Text>

                            <Text style={styles.venueText}>
                              {t("bookings.payAtVenueInstruction").replace(
                                "{amount}",

                                String(game.price),
                              )}
                            </Text>
                          </View>
                        </View>
                      )}

                    {/* CANCELLED ORGANIZER PAYMENT */}

                    {isCancelled &&
                      isOrganizerPayment &&
                      (booking.payment_status === "paid" ||
                        booking.payment_status === "submitted") && (
                        <View style={styles.refundNotice}>
                          <View style={styles.refundHeader}>
                            <Ionicons
                              name="information-circle-outline"

                              size={22}

                              color="#F6C85F"
                            />

                            <View style={{ flex: 1 }}>
                              <Text style={styles.refundTitle}>
                                {cancelledByOrganizer
                                  ? t("bookings.gameCancelledByOrganizer")
                                  : t("bookings.organizerPayment")}
                              </Text>

                              <Text style={styles.refundNoticeText}>
                                {cancelledByOrganizer
                                  ? t(
                                      "bookings.organizerCancelledContactRefund",
                                    )
                                  : t("bookings.organizerPaymentRefundContact")}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.contactCard}>
                            <Text style={styles.contactLabel}>
                              {t("bookings.organizer")}
                            </Text>

                            <Text style={styles.contactValue}>
                              {game.organizer}
                            </Text>

                            {game.payment_phone ? (
                              <>
                                <View style={styles.contactDivider} />

                                <Text style={styles.contactLabel}>
                                  {t("bookings.paymentContactNumber")}
                                </Text>

                                <Text selectable style={styles.contactPhone}>
                                  {game.payment_phone}
                                </Text>

                                <Pressable
                                  style={styles.callButton}

                                  onPress={() =>
                                    callOrganizer(game.payment_phone)
                                  }
                                >
                                  <Ionicons
                                    name="call-outline"

                                    size={19}

                                    color={COLORS.background}
                                  />

                                  <Text style={styles.callButtonText}>
                                    {t("bookings.callOrganizer")}
                                  </Text>
                                </Pressable>
                              </>
                            ) : (
                              <Text style={styles.noContactText}>
                                {t("bookings.noOrganizerContact")}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                    {/* NORMAL CANCELLED HISTORY */}

                    {isCancelled &&
                      !(
                        isOrganizerPayment &&
                        (booking.payment_status === "paid" ||
                          booking.payment_status === "submitted")
                      ) && (
                        <View style={styles.historyNotice}>
                          <Ionicons
                            name="information-circle-outline"

                            size={20}

                            color={COLORS.textSecondary}
                          />

                          <Text style={styles.historyNoticeText}>
                            {cancelledByOrganizer
                              ? t("bookings.gameCancelledByOrganizerShort")
                              : t("bookings.youCancelledBooking")}
                          </Text>
                        </View>
                      )}

                    {(isConfirmed || isWaitlisted) && !isCancelled && (
                      <Pressable
                        style={[
                          styles.cancelButton,

                          isCancelling && styles.disabledButton,
                        ]}

                        onPress={() => openCancellationModal(booking)}

                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <ActivityIndicator size="small" color="#FF747A" />
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
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable
          style={styles.calendarOverlay}
          onPress={() => setCalendarVisible(false)}
        >
          <Pressable
            style={styles.calendarModal}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarTitle}>
                  {language === "am"
                    ? "ቀን ይምረጡ"
                    : language === "om"
                      ? "Guyyaa fili"
                      : "Choose a date"}
                </Text>

                <Text style={styles.calendarSubtitle}>
                  {language === "am"
                    ? "የወደፊት ቀን ቦታ ማስያዝዎን ይፈልጉ"
                    : language === "om"
                      ? "Guyyaa fuulduraa irratti qabannaa kee barbaadi"
                      : "Filter your upcoming bookings by date"}
                </Text>
              </View>

              <Pressable
                style={styles.calendarCloseButton}
                onPress={() => setCalendarVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            {language === "en" ? (
              <Calendar
                minDate={getTodayAddisKey()}
                current={selectedDate ?? undefined}
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setCalendarVisible(false);
                }}
                markedDates={
                  selectedDate
                    ? {
                        [selectedDate]: {
                          selected: true,
                        },
                      }
                    : {}
                }
                enableSwipeMonths
                theme={{
                  calendarBackground: COLORS.surface,
                  backgroundColor: COLORS.surface,
                  monthTextColor: COLORS.text,
                  dayTextColor: COLORS.text,
                  textDisabledColor: COLORS.textMuted,
                  arrowColor: COLORS.primary,
                  todayTextColor: COLORS.primary,
                  selectedDayBackgroundColor: COLORS.primary,
                  selectedDayTextColor: COLORS.background,
                  textMonthFontWeight: "800",
                  textDayFontWeight: "500",
                  textDayHeaderFontWeight: "700",
                }}
              />
            ) : (
              <EthiopianCalendar
                language={language}
                selectedDate={selectedDate}
                onSelect={(gregorianDate) => {
                  setSelectedDate(gregorianDate);
                  setCalendarVisible(false);
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
              : selectedIsOrganizerPaid
                ? t("bookings.cancelOrganizerPaidMessage").replace(
                    "{game}",

                    selectedBooking?.games?.title ?? t("bookings.thisGame"),
                  )
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

function getStatusInfo(
  status: BookingStatus,

  paymentStatus: PaymentStatus,

  organizerPayment: boolean,

  t: (key: string) => string,
): {
  label: string;

  color: string;

  backgroundColor: string;

  icon: "checkmark-circle" | "time-outline" | "close-circle";
} {
  if (status === "pending_payment") {
    if (organizerPayment && paymentStatus === "submitted") {
      return {
        label: t("bookings.waitingForOrganizer"),

        color: "#F6C85F",

        backgroundColor: "#2A2415",

        icon: "time-outline",
      };
    }

    return {
      label: t("bookings.organizerPaymentRequired"),

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

function getAddisDateKey(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function formatEthiopianDate(timestamp: string, language: "en" | "am" | "om") {
  const date = new Date(timestamp);

  // Read Gregorian date using Addis Ababa timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  // Gregorian -> Julian Day Number
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Julian Day Number -> Ethiopian calendar
  const r = (jdn - 1724221) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const ethYear =
    4 * Math.floor((jdn - 1724221) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460) +
    1;

  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  const amharicMonths = [
    "መስከረም",
    "ጥቅምት",
    "ኅዳር",
    "ታኅሣሥ",
    "ጥር",
    "የካቲት",
    "መጋቢት",
    "ሚያዝያ",
    "ግንቦት",
    "ሰኔ",
    "ሐምሌ",
    "ነሐሴ",
    "ጳጉሜ",
  ];

  const oromoMonths = [
    "Fulbaana",
    "Onkololeessa",
    "Sadaasa",
    "Muddee",
    "Amajjii",
    "Guraandhala",
    "Bitooteessa",
    "Ebla",
    "Caamsaa",
    "Waxabajjii",
    "Adooleessa",
    "Hagayya",
    "Qaammee",
  ];

  const months = language === "om" ? oromoMonths : amharicMonths;

  return `${months[ethMonth - 1]} ${ethDay} ${ethYear}`;
}

function formatAddisDate(timestamp: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Africa/Addis_Ababa",

    weekday: "short",

    month: "short",

    day: "numeric",

    year: "numeric",
  }).format(new Date(timestamp));
}

type EthiopianLanguage = "am" | "om";

const AMHARIC_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
];

const OROMO_MONTHS = [
  "Fulbaana",
  "Onkololeessa",
  "Sadaasa",
  "Muddee",
  "Amajjii",
  "Guraandhala",
  "Bitooteessa",
  "Ebla",
  "Caamsaa",
  "Waxabajjii",
  "Adooleessa",
  "Hagayya",
  "Qaammee",
];

function gregorianToJdn(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToEthiopian(jdn: number) {
  const r = (jdn - 1724221) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  return {
    year:
      4 * Math.floor((jdn - 1724221) / 1461) +
      Math.floor(r / 365) -
      Math.floor(r / 1460) +
      1,
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

function getEthiopianDate(
  timestamp: string | Date,
  language: EthiopianLanguage,
) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const eth = jdnToEthiopian(gregorianToJdn(year, month, day));
  const months = language === "om" ? OROMO_MONTHS : AMHARIC_MONTHS;

  return {
    ...eth,
    monthName: months[eth.month - 1],
    label: `${months[eth.month - 1]} ${eth.day} ${eth.year}`,
  };
}

function ethiopianToJdn(year: number, month: number, day: number) {
  return (
    1724221 +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * (month - 1) +
    day -
    1
  );
}

function jdnToGregorian(jdn: number) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return { year, month, day };
}

function ethiopianToGregorianKey(year: number, month: number, day: number) {
  const gregorian = jdnToGregorian(ethiopianToJdn(year, month, day));

  return `${gregorian.year}-${String(gregorian.month).padStart(
    2,
    "0",
  )}-${String(gregorian.day).padStart(2, "0")}`;
}

function getTodayAddisKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isEthiopianLeapYear(year: number) {
  return year % 4 === 3;
}

function EthiopianCalendar({
  language,
  selectedDate,
  onSelect,
}: {
  language: EthiopianLanguage;
  selectedDate: string | null;
  onSelect: (gregorianDate: string) => void;
}) {
  const todayEthiopian = useMemo(
    () => getEthiopianDate(new Date(), language),
    [language],
  );

  const [viewYear, setViewYear] = useState(todayEthiopian.year);
  const [viewMonth, setViewMonth] = useState(todayEthiopian.month);

  const months = language === "om" ? OROMO_MONTHS : AMHARIC_MONTHS;

  const weekdays =
    language === "om"
      ? ["Dil", "Wix", "Kib", "Rob", "Kam", "Jim", "San"]
      : ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ"];

  const daysInMonth =
    viewMonth <= 12 ? 30 : isEthiopianLeapYear(viewYear) ? 6 : 5;

  const firstDate = ethiopianToGregorianKey(viewYear, viewMonth, 1);

  const [firstYear, firstMonth, firstDay] = firstDate.split("-").map(Number);

  const firstWeekday = new Date(
    Date.UTC(firstYear, firstMonth - 1, firstDay, 12),
  ).getUTCDay();

  const cells: Array<number | null> = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length < 42) {
    cells.push(null);
  }

  const today = getTodayAddisKey();

  function previousMonth() {
    if (viewMonth === 1) {
      setViewMonth(13);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 13) {
      setViewMonth(1);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  }

  return (
    <View>
      <View style={styles.ethMonthHeader}>
        <Pressable style={styles.ethArrow} onPress={previousMonth}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </Pressable>

        <Text style={styles.ethMonthTitle}>
          {months[viewMonth - 1]} {viewYear}
        </Text>

        <Pressable style={styles.ethArrow} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </Pressable>
      </View>

      <View style={styles.ethWeekRow}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={styles.ethWeekday}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.ethGrid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.ethCell} />;
          }

          const gregorianKey = ethiopianToGregorianKey(
            viewYear,
            viewMonth,
            day,
          );

          const selected = gregorianKey === selectedDate;
          const isToday = gregorianKey === today;
          const disabled = gregorianKey < today;

          return (
            <Pressable
              key={gregorianKey}
              style={styles.ethCell}
              disabled={disabled}
              onPress={() => onSelect(gregorianKey)}
            >
              <View
                style={[styles.ethDayCircle, selected && styles.ethSelected]}
              >
                <Text
                  style={[
                    styles.ethDayText,
                    isToday && styles.ethToday,
                    disabled && styles.ethDisabled,
                    selected && styles.ethSelectedText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  searchBox: {
    flex: 1,
    height: 58,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: COLORS.surface,
  },

  searchInput: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
    color: COLORS.text,
    fontSize: 16,
  },

  filterButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    borderColor: COLORS.primary,
  },

  activeDateFilter: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    marginBottom: 18,
  },

  activeDateFilterText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  ethMonthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  ethArrow: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  ethMonthTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  ethWeekRow: {
    flexDirection: "row",
    marginBottom: 5,
  },

  ethWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  ethGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  ethCell: {
    width: "14.2857%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  ethDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  ethDayText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },

  ethToday: {
    color: COLORS.primary,
  },

  ethDisabled: {
    color: COLORS.textMuted,
    opacity: 0.5,
  },

  ethSelected: {
    backgroundColor: COLORS.primary,
  },

  ethSelectedText: {
    color: COLORS.background,
    fontWeight: "800",
  },

  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  calendarModal: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  calendarTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
  },

  calendarSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },

  calendarCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
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

  contentDesktop: {
    width: "100%",

    maxWidth: 1180,

    alignSelf: "center",

    paddingHorizontal: 28,

    paddingTop: 24,
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

    backgroundColor: COLORS.surface,

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

  imagePlaceholder: {
    width: "100%",

    height: 170,

    backgroundColor: COLORS.surface,

    alignItems: "center",

    justifyContent: "center",
  },

  cancelledImage: {
    opacity: 0.45,
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
    backgroundColor: COLORS.surface,

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

  paymentSection: {
    marginTop: 18,

    backgroundColor: "#171D1B",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 16,

    padding: 14,
  },

  paymentHeader: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 10,
  },

  paymentTitle: {
    color: COLORS.text,

    fontSize: 16,

    fontWeight: "800",
  },

  paymentDescription: {
    color: COLORS.textSecondary,

    fontSize: 13,

    lineHeight: 18,

    marginTop: 3,
  },

  paymentAccountCard: {
    marginTop: 14,

    backgroundColor: COLORS.surface,

    borderRadius: 13,

    paddingHorizontal: 13,
  },

  paymentAccountRow: {
    minHeight: 45,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,
  },

  paymentDivider: {
    height: 1,

    backgroundColor: COLORS.border,
  },

  paymentLabel: {
    color: COLORS.textSecondary,

    fontSize: 13,
  },

  paymentValue: {
    color: COLORS.text,

    fontSize: 14,

    fontWeight: "700",
  },

  paymentAmount: {
    color: COLORS.primary,

    fontSize: 16,

    fontWeight: "800",
  },

  paymentInstruction: {
    color: COLORS.textSecondary,

    fontSize: 12,

    lineHeight: 18,

    marginTop: 12,
  },

  paidButton: {
    height: 50,

    borderRadius: 13,

    backgroundColor: COLORS.primary,

    marginTop: 13,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  paidButtonText: {
    color: COLORS.background,

    fontSize: 15,

    fontWeight: "800",
  },

  waitingPaymentNotice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 10,

    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 13,

    padding: 13,

    marginTop: 17,
  },

  waitingPaymentTitle: {
    color: "#F6C85F",

    fontSize: 14,

    fontWeight: "800",
  },

  waitingPaymentText: {
    color: COLORS.textSecondary,

    fontSize: 12,

    lineHeight: 17,

    marginTop: 3,
  },

  confirmedPaymentNotice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 10,

    backgroundColor: "#0A211C",

    borderWidth: 1,

    borderColor: "#1E5A46",

    borderRadius: 13,

    padding: 13,

    marginTop: 17,
  },

  confirmedPaymentTitle: {
    color: COLORS.primary,

    fontSize: 14,

    fontWeight: "800",
  },

  confirmedPaymentText: {
    color: COLORS.textSecondary,

    fontSize: 12,

    marginTop: 3,
  },

  venueNotice: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 10,

    backgroundColor: "#0A211C",

    borderRadius: 13,

    padding: 13,

    marginTop: 17,
  },

  venueTitle: {
    color: COLORS.primary,

    fontSize: 14,

    fontWeight: "800",
  },

  venueText: {
    color: COLORS.textSecondary,

    fontSize: 12,

    marginTop: 3,
  },

  refundNotice: {
    backgroundColor: "#2A2415",

    borderWidth: 1,

    borderColor: "#5E522C",

    borderRadius: 13,

    padding: 13,

    marginTop: 17,
  },

  refundHeader: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 9,
  },

  refundTitle: {
    color: "#F6C85F",

    fontSize: 14,

    fontWeight: "800",
  },

  refundNoticeText: {
    color: COLORS.textSecondary,

    fontSize: 12,

    lineHeight: 18,

    marginTop: 3,
  },

  contactCard: {
    marginTop: 13,

    backgroundColor: COLORS.surface,

    borderRadius: 12,

    padding: 12,
  },

  contactLabel: {
    color: COLORS.textSecondary,

    fontSize: 12,
  },

  contactValue: {
    color: COLORS.text,

    fontSize: 15,

    fontWeight: "700",

    marginTop: 3,
  },

  contactDivider: {
    height: 1,

    backgroundColor: COLORS.border,

    marginVertical: 11,
  },

  contactPhone: {
    color: COLORS.text,

    fontSize: 17,

    fontWeight: "800",

    marginTop: 4,
  },

  callButton: {
    height: 44,

    borderRadius: 11,

    backgroundColor: COLORS.primary,

    marginTop: 12,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,
  },

  callButtonText: {
    color: COLORS.background,

    fontSize: 14,

    fontWeight: "800",
  },

  noContactText: {
    color: COLORS.textSecondary,

    fontSize: 12,

    lineHeight: 17,

    marginTop: 8,
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

  disabledButton: {
    opacity: 0.6,
  },
});
