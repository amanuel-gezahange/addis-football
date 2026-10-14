import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";

import { supabase } from "../../lib/supabase";

import { useLanguage } from "../../i18n/LanguageContext";

type PaymentRequest = {
    id: number;

    booking_id: number;

    game_id: number;

    user_id: string;

    provider: string | null;

    amount: number;

    currency: string;

    status: string;

    submitted_at: string | null;

    game_title: string;

    player_name: string;

    player_phone: string | null;
};

export default function PaymentRequestsScreen() {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [confirmingId, setConfirmingId] = useState<number | null>(null);

    const { t } = useLanguage();

    const loadRequests = useCallback(async () => {
        try {
            const {
                data: { user },

                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                Alert.alert(
                    t("paymentRequests.error"),
                    t("paymentRequests.mustBeSignedIn"),
                );

                return;
            }

            const { data: profile, error: profileError } = await supabase

                .from("profiles")

                .select("role")

                .eq("id", user.id)

                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            const role = profile?.role || "player";

            if (role !== "admin" && role !== "organizer") {
                Alert.alert(
                    t("paymentRequests.notAllowed"),
                    t("paymentRequests.organizersAdminsOnly"),
                );

                router.back();

                return;
            }

            const { data: paymentRows, error: paymentError } = await supabase

                .from("payments")

                .select(
                    `
         id,
         booking_id,
         game_id,
         user_id,
         provider,
         amount,
         currency,
         status,
         submitted_at
       `,
                )

                .eq("status", "submitted")

                .order("submitted_at", { ascending: true });

            if (paymentError) {
                throw paymentError;
            }

            if (!paymentRows || paymentRows.length === 0) {
                setRequests([]);

                return;
            }

            const gameIds = [
                ...new Set(
                    paymentRows

                        .map((payment) => payment.game_id)

                        .filter((id): id is number => typeof id === "number"),
                ),
            ];

            const userIds = [
                ...new Set(
                    paymentRows

                        .map((payment) => payment.user_id)

                        .filter((id): id is string => Boolean(id)),
                ),
            ];

            const { data: games, error: gamesError } = await supabase

                .from("games")

                .select("id, title, organizer, payment_method")

                .in("id", gameIds);

            if (gamesError) {
                throw gamesError;
            }

            const { data: players, error: playersError } = await supabase

                .from("profiles")

                .select("id, full_name, phone")

                .in("id", userIds);

            if (playersError) {
                throw playersError;
            }

            const gameMap = new Map(
                (games || []).map((game) => [game.id, game]),
            );

            const playerMap = new Map(
                (players || []).map((player) => [player.id, player]),
            );

            const visiblePayments = paymentRows.filter((payment) => {
                const game = gameMap.get(payment.game_id);

                // Payment Requests is only for the current
                // organizer-direct payment flow.
                if (game?.payment_method !== "organizer") {
                    return false;
                }

                if (role === "admin") {
                    return true;
                }

                return game.organizer === user.id;
            });

            const formatted: PaymentRequest[] = visiblePayments.map(
                (payment) => {
                    const game = gameMap.get(payment.game_id);

                    const player = playerMap.get(payment.user_id);

                    return {
                        id: payment.id,

                        booking_id: payment.booking_id,

                        game_id: payment.game_id,

                        user_id: payment.user_id,

                        provider: payment.provider,

                        amount: payment.amount,

                        currency: payment.currency,

                        status: payment.status,

                        submitted_at: payment.submitted_at,

                        game_title:
                            game?.title || t("paymentRequests.footballGame"),

                        player_name:
                            player?.full_name ||
                            t("paymentRequests.playerFallback"),

                        player_phone: player?.phone || null,
                    };
                },
            );

            setRequests(formatted);
        } catch (error: any) {
            console.log("Load payment requests error:", error);

            Alert.alert(
                t("paymentRequests.couldNotLoadPayments"),
                error?.message || t("paymentRequests.pleaseTryAgain"),
            );
        } finally {
            setLoading(false);

            setRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    async function handleRefresh() {
        setRefreshing(true);

        await loadRequests();
    }

    async function handleMarkPaid(request: PaymentRequest) {
        try {
            setConfirmingId(request.id);

            console.log("MARK PAID DEBUG:", {
                paymentId: request.id,

                bookingId: request.booking_id,
            });

            const { data, error } = await supabase.rpc(
                "confirm_organizer_payment",

                {
                    p_booking_id: request.booking_id,
                },
            );

            console.log("MARK PAID RESULT:", data);

            console.log("MARK PAID ERROR:", error);

            if (error) {
                throw error;
            }

            if (!data?.success) {
                throw new Error(
                    t("paymentRequests.paymentCouldNotBeConfirmed"),
                );
            }

            setRequests((current) =>
                current.filter((item) => item.id !== request.id),
            );
        } catch (error: any) {
            console.log("Confirm payment error:", error);

            if (Platform.OS === "web") {
                window.alert(
                    error?.message ||
                        t("paymentRequests.couldNotConfirmPayment"),
                );
            } else {
                Alert.alert(
                    t("paymentRequests.couldNotConfirmPayment"),
                    error?.message || t("paymentRequests.pleaseTryAgain"),
                );
            }
        } finally {
            setConfirmingId(null);
        }
    }

    function formatSubmittedAt(value: string | null) {
        if (!value) {
            return t("paymentRequests.recentlySubmitted");
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return t("paymentRequests.recentlySubmitted");
        }

        return date.toLocaleString();
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea} edges={["top"]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />

                    <Text style={styles.loadingText}>
                        {t("paymentRequests.loading")}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.header}>
                <Pressable
                    style={styles.backButton}

                    onPress={() => router.replace("/(tabs)/profile")}

                    hitSlop={10}
                >
                    <Ionicons
                        name="chevron-back"

                        size={25}

                        color={COLORS.text}
                    />
                </Pressable>

                <View style={styles.headerText}>
                    <Text style={styles.title}>
                        {t("paymentRequests.title")}
                    </Text>

                    <Text style={styles.subtitle}>
                        {t("paymentRequests.subtitle")}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.container}

                contentContainerStyle={styles.content}

                showsVerticalScrollIndicator={false}

                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}

                        onRefresh={handleRefresh}

                        tintColor={COLORS.primary}
                    />
                }
            >
                {requests.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIcon}>
                            <Ionicons
                                name="checkmark-circle-outline"

                                size={34}

                                color={COLORS.primary}
                            />
                        </View>

                        <Text style={styles.emptyTitle}>
                            {t("paymentRequests.noRequests")}
                        </Text>

                        <Text style={styles.emptyText}>
                            {t("paymentRequests.noRequestsDescription")}
                        </Text>
                    </View>
                ) : (
                    requests.map((request) => {
                        const isConfirming = confirmingId === request.id;

                        return (
                            <View key={request.id} style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View style={styles.gameIcon}>
                                        <Ionicons
                                            name="football-outline"

                                            size={22}

                                            color={COLORS.primary}
                                        />
                                    </View>

                                    <View style={styles.gameInfo}>
                                        <Text style={styles.gameTitle}>
                                            {request.game_title}
                                        </Text>

                                        <Text style={styles.submittedText}>
                                            {formatSubmittedAt(
                                                request.submitted_at,
                                            )}
                                        </Text>
                                    </View>

                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>
                                            {t("paymentRequests.submitted")}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>
                                        {t("paymentRequests.player")}
                                    </Text>

                                    <Text style={styles.detailValue}>
                                        {request.player_name}
                                    </Text>
                                </View>

                                {request.player_phone ? (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                            {t("paymentRequests.phone")}
                                        </Text>

                                        <Text style={styles.detailValue}>
                                            {request.player_phone}
                                        </Text>
                                    </View>
                                ) : null}

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>
                                        {t("paymentRequests.method")}
                                    </Text>

                                    <Text style={styles.detailValue}>
                                        {request.provider ||
                                            t(
                                                "paymentRequests.organizerPayment",
                                            )}
                                    </Text>
                                </View>

                                <View style={styles.amountRow}>
                                    <View>
                                        <Text style={styles.amountLabel}>
                                            {t(
                                                "paymentRequests.amountToVerify",
                                            )}
                                        </Text>

                                        <Text style={styles.amount}>
                                            {request.amount} {request.currency}
                                        </Text>
                                    </View>

                                    <Ionicons
                                        name="wallet-outline"

                                        size={27}

                                        color={COLORS.primary}
                                    />
                                </View>

                                <View style={styles.warningBox}>
                                    <Ionicons
                                        name="information-circle-outline"

                                        size={20}

                                        color="#F5C451"
                                    />

                                    <Text style={styles.warningText}>
                                        {t(
                                            "paymentRequests.checkAccountBeforeConfirming",
                                        ).replace(
                                            "{provider}",
                                            request.provider ||
                                                t(
                                                    "paymentRequests.paymentFallback",
                                                ),
                                        )}
                                    </Text>
                                </View>

                                <Pressable
                                    style={[
                                        styles.confirmButton,

                                        isConfirming && styles.disabledButton,
                                    ]}

                                    onPress={() => handleMarkPaid(request)}

                                    disabled={isConfirming}
                                >
                                    {isConfirming ? (
                                        <ActivityIndicator
                                            color={COLORS.background}
                                        />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name="checkmark-circle"

                                                size={22}

                                                color={COLORS.background}
                                            />

                                            <Text
                                                style={styles.confirmButtonText}
                                            >
                                                {t("paymentRequests.markPaid")}
                                            </Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        );
                    })
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,

        backgroundColor: COLORS.background,
    },

    header: {
        flexDirection: "row",

        alignItems: "center",

        paddingHorizontal: 18,

        paddingTop: 12,

        paddingBottom: 16,

        borderBottomWidth: 1,

        borderBottomColor: COLORS.border,
    },

    backButton: {
        width: 42,

        height: 42,

        borderRadius: 21,

        borderWidth: 1,

        borderColor: COLORS.border,

        backgroundColor: COLORS.surface,

        alignItems: "center",

        justifyContent: "center",

        marginRight: 12,
    },

    headerText: {
        flex: 1,
    },

    title: {
        color: COLORS.text,

        fontSize: 24,

        fontWeight: "800",

        letterSpacing: -0.5,
    },

    subtitle: {
        color: COLORS.textSecondary,

        fontSize: 13,

        marginTop: 3,
    },

    container: {
        flex: 1,
    },

    content: {
        padding: 18,
    },

    loadingContainer: {
        flex: 1,

        alignItems: "center",

        justifyContent: "center",
    },

    loadingText: {
        color: COLORS.textSecondary,

        fontSize: 14,

        marginTop: 12,
    },

    emptyCard: {
        marginTop: 60,

        alignItems: "center",

        paddingHorizontal: 30,
    },

    emptyIcon: {
        width: 68,

        height: 68,

        borderRadius: 34,

        backgroundColor: COLORS.surfaceAlt,

        borderWidth: 1,

        borderColor: COLORS.border,

        alignItems: "center",

        justifyContent: "center",
    },

    emptyTitle: {
        color: COLORS.text,

        fontSize: 20,

        fontWeight: "800",

        marginTop: 16,
    },

    emptyText: {
        color: COLORS.textSecondary,

        fontSize: 14,

        lineHeight: 21,

        textAlign: "center",

        marginTop: 7,
    },

    card: {
        backgroundColor: COLORS.surface,

        borderWidth: 1,

        borderColor: COLORS.border,

        borderRadius: 18,

        padding: 16,

        marginBottom: 14,
    },

    cardTop: {
        flexDirection: "row",

        alignItems: "center",
    },

    gameIcon: {
        width: 44,

        height: 44,

        borderRadius: 13,

        backgroundColor: COLORS.surfaceAlt,

        alignItems: "center",

        justifyContent: "center",

        marginRight: 11,
    },

    gameInfo: {
        flex: 1,
    },

    gameTitle: {
        color: COLORS.text,

        fontSize: 17,

        fontWeight: "800",
    },

    submittedText: {
        color: COLORS.textMuted,

        fontSize: 11,

        marginTop: 3,
    },

    statusBadge: {
        paddingHorizontal: 9,

        paddingVertical: 6,

        borderRadius: 20,

        backgroundColor: "#332A13",

        borderWidth: 1,

        borderColor: "#6A5421",
    },

    statusText: {
        color: "#F5C451",

        fontSize: 11,

        fontWeight: "800",
    },

    divider: {
        height: 1,

        backgroundColor: COLORS.border,

        marginVertical: 15,
    },

    detailRow: {
        flexDirection: "row",

        alignItems: "center",

        justifyContent: "space-between",

        marginBottom: 11,

        gap: 15,
    },

    detailLabel: {
        color: COLORS.textMuted,

        fontSize: 13,
    },

    detailValue: {
        flex: 1,

        color: COLORS.text,

        fontSize: 14,

        fontWeight: "700",

        textAlign: "right",
    },

    amountRow: {
        minHeight: 78,

        borderRadius: 14,

        backgroundColor: COLORS.surfaceAlt,

        paddingHorizontal: 14,

        paddingVertical: 12,

        marginTop: 4,

        flexDirection: "row",

        alignItems: "center",

        justifyContent: "space-between",
    },

    amountLabel: {
        color: COLORS.textMuted,

        fontSize: 12,
    },

    amount: {
        color: COLORS.text,

        fontSize: 25,

        fontWeight: "900",

        marginTop: 3,
    },

    warningBox: {
        flexDirection: "row",

        alignItems: "flex-start",

        gap: 9,

        backgroundColor: "#2A2516",

        borderWidth: 1,

        borderColor: "#5C4B20",

        borderRadius: 13,

        padding: 12,

        marginTop: 13,
    },

    warningText: {
        flex: 1,

        color: "#E7C96F",

        fontSize: 12,

        lineHeight: 18,
    },

    confirmButton: {
        height: 56,

        borderRadius: 14,

        backgroundColor: COLORS.primary,

        alignItems: "center",

        justifyContent: "center",

        flexDirection: "row",

        gap: 8,

        marginTop: 14,
    },

    confirmButtonText: {
        color: COLORS.background,

        fontSize: 16,

        fontWeight: "900",
    },

    disabledButton: {
        opacity: 0.6,
    },
});
