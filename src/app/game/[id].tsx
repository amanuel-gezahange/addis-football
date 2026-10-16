import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GameBookingAction from "../../components/GameBookingAction";
import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";

type GameDetails = {
  id: number;
  title: string;
  organizer: string | null;
  area: string | null;
  distance: string | null;
  time: string | null;
  format: string | null;
  skill: string | null;
  price: number;
  spots_left: number;
  status: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  payment_method: string | null;
  city: string | null;
  maps_url: string | null;
};

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, t } = useLanguage();

  const [game, setGame] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGame();
  }, [id]);

  async function loadGame() {
    if (!id) {
      setError(t("gameDetails.gameNotFound"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: gameError } = await supabase
      .from("games")
      .select(
        `
          id,
          title,
          organizer,
          area,
          distance,
          time,
          format,
          skill,
          price,
          spots_left,
          status,
          image_url,
          starts_at,
          ends_at,
          payment_method,
          city,
          maps_url
        `,
      )
      .eq("id", Number(id))
      .single();

    if (gameError || !data) {
      console.log("Game details error:", gameError?.message);

      setError(t("gameDetails.couldNotLoadGame"));
      setGame(null);
      setLoading(false);
      return;
    }

    setGame(data as GameDetails);
    setLoading(false);
  }

  function getLocale() {
    if (language === "am") return "am-ET";
    if (language === "om") return "om-ET";

    return "en-US";
  }

  function formatDate(value: string | null) {
    if (!value) return null;

    return new Intl.DateTimeFormat(getLocale(), {
      timeZone: "Africa/Addis_Ababa",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  }

  function formatTime(value: string | null) {
    if (!value) return null;

    return new Intl.DateTimeFormat(getLocale(), {
      timeZone: "Africa/Addis_Ababa",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function getTimeRange() {
    if (!game) return "";

    const start = formatTime(game.starts_at);
    const end = formatTime(game.ends_at);

    if (start && end) {
      return `${start} – ${end}`;
    }

    if (start) return start;

    return game.time ?? "";
  }

  function getLocation() {
    if (!game) return "";

    const area = String(game.area ?? "").trim();
    const city = String(game.city ?? "").trim();

    if (area && city && !area.toLowerCase().includes(city.toLowerCase())) {
      return `${area}, ${city}`;
    }

    return area || city;
  }

  function getSkillLabel(skill: string | null) {
    if (!skill) {
      return t("gameDetails.allLevels");
    }

    const normalizedSkill = skill.trim().toLowerCase();

    if (normalizedSkill === "beginner") {
      return t("discover.beginner");
    }

    if (normalizedSkill === "intermediate") {
      return t("discover.intermediate");
    }

    if (normalizedSkill === "advanced") {
      return t("discover.advanced");
    }

    return skill;
  }

  function shouldShowCitySeparately() {
    if (!game?.city) return false;

    const area = String(game.area ?? "").trim().toLowerCase();
    const city = String(game.city).trim().toLowerCase();

    if (!city) return false;

    return !area.includes(city);
  }

  async function openLocation() {
    if (!game) return;

    const savedMapsUrl = String(game.maps_url ?? "").trim();
    const location = getLocation();

    const targetUrl =
      savedMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location,
      )}`;

    try {
      await Linking.openURL(targetUrl);
    } catch (locationError) {
      console.log("Could not open game location:", locationError);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !game) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorScreen}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            }}
          >
            <Ionicons name="arrow-back" size={21} color="#087EA4" />

            <Text style={styles.backText}>
              {t("gameDetails.discover")}
            </Text>
          </Pressable>

          <View style={styles.errorContent}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="football-outline"
                size={30}
                color="#087EA4"
              />
            </View>

            <Text style={styles.errorTitle}>
              {t("gameDetails.gameUnavailable")}
            </Text>

            <Text style={styles.errorText}>
              {error ?? t("gameDetails.gameCouldNotBeFound")}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const date = formatDate(game.starts_at);
  const location = getLocation();

  const isFull =
    game.status === "full" || Number(game.spots_left ?? 0) <= 0;

  const isFree = Number(game.price ?? 0) === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={21} color="#087EA4" />

            <Text style={styles.backText}>
              {t("gameDetails.discover")}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}

          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroText}>
                <Text style={styles.title}>{game.title}</Text>

                {!!location && (
                  <Text style={styles.heroLocation}>{location}</Text>
                )}
              </View>

              <Pressable style={styles.favorite} hitSlop={8}>
                <Ionicons
                  name="heart-outline"
                  size={24}
                  color="#222222"
                />
              </Pressable>
            </View>

            {!!date && (
              <View style={styles.schedule}>
                <Text style={styles.scheduleDate}>{date}</Text>

                <Text style={styles.scheduleTime}>
                  {getTimeRange()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* GAME DETAILS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("gameDetails.gameDetails")}
            </Text>

            <View style={styles.detailList}>
              <DetailRow
                icon="football-outline"
                title={game.format || t("gameDetails.notSpecified")}
                subtitle={t("gameDetails.format")}
              />

              <DetailRow
                icon="speedometer-outline"
                title={getSkillLabel(game.skill)}
                subtitle={t("gameDetails.skillLevel")}
              />

              <DetailRow
                icon="people-outline"
                title={
                  isFull
                    ? t("gameDetails.gameFull")
                    : game.spots_left === 1
                      ? t("gameDetails.spotLeft").replace(
                          "{count}",
                          String(game.spots_left),
                        )
                      : t("gameDetails.spotsLeft").replace(
                          "{count}",
                          String(game.spots_left),
                        )
                }
                subtitle={t("gameDetails.availability")}
                danger={isFull}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* ORGANIZER */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("gameDetails.hostedBy")}
            </Text>

            <View style={styles.organizerRow}>
              <View style={styles.organizerAvatar}>
                <Ionicons
                  name="person-outline"
                  size={23}
                  color="#087EA4"
                />
              </View>

              <View style={styles.organizerText}>
                <Text style={styles.organizerName}>
                  {game.organizer || t("gameDetails.organizer")}
                </Text>

                <Text style={styles.organizerLabel}>
                  {t("gameDetails.gameOrganizer")}
                </Text>
              </View>
            </View>
          </View>

          {!!location && (
            <>
              <View style={styles.divider} />

              {/* LOCATION */}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t("gameDetails.location")}
                </Text>

                <Text style={styles.locationName}>{location}</Text>

                {shouldShowCitySeparately() && !!game.city && (
                  <Text style={styles.locationCity}>
                    {game.city}
                  </Text>
                )}

                <Pressable
                  style={styles.mapAction}
                  onPress={openLocation}
                >
                  <Ionicons
                    name="map-outline"
                    size={18}
                    color="#087EA4"
                  />

                  <Text style={styles.mapActionText}>
                    {t("gameDetails.viewOnMap")}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#087EA4"
                  />
                </Pressable>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* PAYMENT */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("gameDetails.payment")}
            </Text>

            <Text style={styles.paymentPrice}>
              {isFree ? t("gameDetails.free") : `${game.price} ETB`}
            </Text>

            <Text style={styles.paymentDescription}>
              {isFree
                ? t("gameDetails.noPaymentRequired")
                : game.payment_method === "venue"
                  ? t("gameDetails.paymentAtVenue")
                  : game.payment_method === "organizer"
                    ? t(
                        "gameDetails.organizerPaymentInstructions",
                      )
                    : t(
                        "gameDetails.paymentDetailsAfterReservation",
                      )}
            </Text>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* REAL BOOKING / PAYMENT ACTION */}

        <GameBookingAction
          gameId={game.id}
          title={game.title}
          price={Number(game.price ?? 0)}
          spotsLeft={Number(game.spots_left ?? 0)}
          status={game.status}
          onSpotsChange={(nextSpotsLeft) => {
            setGame((currentGame) => {
              if (!currentGame) {
                return currentGame;
              }

              return {
                ...currentGame,
                spots_left: nextSpotsLeft,
                status:
                  nextSpotsLeft <= 0
                    ? "full"
                    : currentGame.status === "full"
                      ? "available"
                      : currentGame.status,
              };
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

type DetailRowProps = {
  icon:
    | "football-outline"
    | "speedometer-outline"
    | "people-outline";
  title: string;
  subtitle: string;
  danger?: boolean;
};

function DetailRow({
  icon,
  title,
  subtitle,
  danger = false,
}: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={22} color="#087EA4" />
      </View>

      <View style={styles.detailText}>
        <Text
          style={[
            styles.detailTitle,
            danger && styles.detailTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.detailSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  errorScreen: {
    flex: 1,
    paddingHorizontal: 20,
  },

  errorContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },

  errorIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EAF8FC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  errorTitle: {
    color: "#222222",
    fontSize: 22,
    fontWeight: "800",
  },

  errorText: {
    color: "#717171",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 7,
  },

  header: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 40,
  },

  backText: {
    color: "#087EA4",
    fontSize: 15,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 27,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  heroText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: "#222222",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  heroLocation: {
    color: "#717171",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 7,
  },

  favorite: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -7,
    marginRight: -8,
  },

  schedule: {
    marginTop: 25,
  },

  scheduleDate: {
    color: "#222222",
    fontSize: 17,
    fontWeight: "700",
  },

  scheduleTime: {
    color: "#717171",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 20,
  },

  section: {
    paddingHorizontal: 20,
    paddingVertical: 25,
  },

  sectionTitle: {
    color: "#222222",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.25,
    marginBottom: 20,
  },

  detailList: {
    gap: 22,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EAF8FC",
    alignItems: "center",
    justifyContent: "center",
  },

  detailText: {
    flex: 1,
  },

  detailTitle: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  detailTitleDanger: {
    color: "#C13515",
  },

  detailSubtitle: {
    color: "#717171",
    fontSize: 13,
    marginTop: 3,
  },

  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF8FC",
    alignItems: "center",
    justifyContent: "center",
  },

  organizerText: {
    flex: 1,
  },

  organizerName: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  organizerLabel: {
    color: "#717171",
    fontSize: 13,
    marginTop: 3,
  },

  locationName: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  locationCity: {
    color: "#717171",
    fontSize: 14,
    marginTop: 4,
  },

  mapAction: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    minHeight: 38,
  },

  mapActionText: {
    color: "#087EA4",
    fontSize: 15,
    fontWeight: "700",
  },

  paymentPrice: {
    color: "#222222",
    fontSize: 24,
    fontWeight: "800",
  },

  paymentDescription: {
    color: "#717171",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 500,
  },

  bottomSpace: {
    height: 28,
  },
});