import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../lib/supabase";
import { Game } from "../types/game";

type Props = {
  game: Game;
};

const fallbackImages = [
  require("../../assets/images/game-fallback-1.png"),
  require("../../assets/images/game-fallback-2.png"),
  require("../../assets/images/game-fallback-3.png"),
  require("../../assets/images/game-fallback-4.png"),
  require("../../assets/images/game-fallback-5.png"),
];

export default function GameCard({ game }: Props) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 375;
  const isLargeScreen = width >= 768;

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  /*
   * CARD INTERACTION
   *
   * Idle:
   *   scale = 1
   *
   * Finger down:
   *   scale = 0.955
   *
   * Release:
   *   scale = 1.018
   *   then spring back to 1
   *
   * This gives the card a noticeable physical press/pop effect.
   */
  const cardScale = useSharedValue(1);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cardScale.value }],
    };
  });

  const spotsLeft = Number(game.spotsLeft ?? 0);
  const price = Number(game.price ?? 0);

  const numericGameId = Number(game.id);

  const fallbackIndex = Number.isFinite(numericGameId)
    ? Math.abs(numericGameId) % fallbackImages.length
    : 0;

  const fallbackImage = fallbackImages[fallbackIndex];

  const isFull = game.status === "full" || spotsLeft <= 0;
  const isLowSpots = !isFull && spotsLeft > 0 && spotsLeft <= 3;

  const locationGame = game as Game & {
    city?: string | null;
  };

  const city = String(locationGame.city ?? "").trim();
  const area = String(game.area ?? "").trim();

  const location =
    city && !area.toLowerCase().includes(city.toLowerCase())
      ? `${area}, ${city}`
      : area;

  useEffect(() => {
    let active = true;

    async function loadFavorite() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("game_id", game.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.log("Favorite lookup error:", error);
        return;
      }

      setIsFavorite(Boolean(data));
    }

    loadFavorite();

    return () => {
      active = false;
    };
  }, [game.id]);

  function pressCardIn() {
    cancelAnimation(cardScale);

    cardScale.value = withTiming(0.955, {
      duration: 90,
    });
  }

  function pressCardOut() {
    cancelAnimation(cardScale);

    cardScale.value = withSequence(
      withTiming(1.018, {
        duration: 110,
      }),
      withSpring(1, {
        damping: 10,
        stiffness: 260,
        mass: 0.45,
      }),
    );
  }

  function navigateToGame() {
    router.push(`/game/${game.id}`);
  }

  function openGameDetails() {
    /*
     * Give the pop animation a moment to become visible
     * before changing screens.
     */
    cancelAnimation(cardScale);

    cardScale.value = withSequence(
      withTiming(1.018, {
        duration: 100,
      }),
      withSpring(
        1,
        {
          damping: 10,
          stiffness: 260,
          mass: 0.45,
        },
        (finished) => {
          if (finished) {
            runOnJS(navigateToGame)();
          }
        },
      ),
    );
  }

  async function toggleFavorite() {
    if (favoriteLoading) {
      return;
    }

    setFavoriteLoading(true);

    const previousFavoriteState = isFavorite;

    setIsFavorite(!previousFavoriteState);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setIsFavorite(previousFavoriteState);
        router.push("/login");
        return;
      }

      if (previousFavoriteState) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("game_id", game.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          game_id: game.id,
        });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.log("Favorite toggle error:", error);
      setIsFavorite(previousFavoriteState);
    } finally {
      setFavoriteLoading(false);
    }
  }

  return (
    <Animated.View style={[styles.card, animatedCardStyle]}>
      {/* IMAGE */}
      <Pressable
        style={[
          styles.imagePressable,
          isSmallScreen && styles.imagePressableSmall,
          isLargeScreen && styles.imagePressableLarge,
        ]}
        onPressIn={pressCardIn}
        onPressOut={pressCardOut}
        onPress={openGameDetails}
        accessibilityRole="button"
        accessibilityLabel={t("gameCard.viewGameDetails").replace(
          "{game}",
          game.title,
        )}
      >
        <Image
          source={game.image ? { uri: game.image } : fallbackImage}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.imageOverlay} />
      </Pressable>

      {/* HEART */}
      <Pressable
        style={({ pressed }) => [
          styles.favorite,
          isSmallScreen && styles.favoriteSmall,
          pressed && styles.favoritePressed,
        ]}
        onPress={toggleFavorite}
        disabled={favoriteLoading}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={
          isFavorite
            ? t("gameCard.removeFromFavorites").replace("{game}", game.title)
            : t("gameCard.saveToFavorites").replace("{game}", game.title)
        }
      >
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={23}
          color={isFavorite ? "#18BFF2" : "#17202A"}
        />
      </Pressable>

      {/* DETAILS */}
      <Pressable
        style={[
          styles.details,
          isSmallScreen && styles.detailsSmall,
          isLargeScreen && styles.detailsLarge,
        ]}
        onPressIn={pressCardIn}
        onPressOut={pressCardOut}
        onPress={openGameDetails}
        accessibilityRole="button"
        accessibilityLabel={t("gameCard.viewDetailsFor").replace(
          "{game}",
          game.title,
        )}
      >
        {/* TITLE */}
        <Text
          style={[
            styles.title,
            isSmallScreen && styles.titleSmall,
            isLargeScreen && styles.titleLarge,
          ]}
          numberOfLines={2}
        >
          {game.title}
        </Text>

        {/* LOCATION */}
        <View style={styles.metaRow}>
          <Ionicons name="location" size={15} color="#536273" />

          <Text style={styles.metaText} numberOfLines={2}>
            {location}
          </Text>
        </View>

        {/* TIME */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={15} color="#536273" />

          <Text style={styles.metaText} numberOfLines={2}>
            {game.time}
          </Text>
        </View>

        {/* BOTTOM */}
        <View
          style={[
            styles.bottomRow,
            isSmallScreen && styles.bottomRowSmall,
          ]}
        >
          <View style={styles.spotsRow}>
            <Ionicons
              name="people-outline"
              size={16}
              color={isFull ? "#C13515" : "#536273"}
            />

            <Text
              style={[styles.spotsText, isFull && styles.fullText]}
              numberOfLines={2}
            >
              {isFull
                ? t("gameCard.gameFull")
                : `${spotsLeft} ${t("gameCard.spotsLeft")}`}
            </Text>
          </View>

          <View
            style={[
              styles.priceBadge,
              price === 0 && styles.freePriceBadge,
            ]}
          >
            <Text style={styles.priceText} numberOfLines={1}>
              {price === 0 ? t("gameCard.free") : `${price} ETB`}
            </Text>
          </View>
        </View>

        {/* LOW SPOTS */}
        {isLowSpots && (
          <View style={styles.urgencyBadge}>
            <Text style={styles.urgencyText}>
              {spotsLeft} {t("gameCard.spotsLeft")}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4E8EC",
    marginBottom: 18,
    overflow: "hidden",
  },

  imagePressable: {
    width: "100%",
    height: 190,
    backgroundColor: "#0B1823",
  },

  imagePressableSmall: {
    height: 170,
  },

  imagePressableLarge: {
    height: 220,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 15, 25, 0.06)",
  },

  favorite: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    zIndex: 10,
  },

  favoriteSmall: {
    top: 12,
    right: 12,
  },

  favoritePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },

  details: {
    position: "relative",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },

  detailsSmall: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
  },

  detailsLarge: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },

  title: {
    color: "#17202A",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 24,
    letterSpacing: -0.35,
    paddingRight: 4,
  },

  titleSmall: {
    fontSize: 18,
    lineHeight: 23,
  },

  titleLarge: {
    fontSize: 20,
    lineHeight: 25,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 8,
  },

  metaText: {
    flex: 1,
    minWidth: 0,
    color: "#536273",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },

  bottomRowSmall: {
    alignItems: "flex-start",
  },

  spotsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },

  spotsText: {
    flexShrink: 1,
    color: "#334155",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },

  fullText: {
    color: "#C13515",
  },

  priceBadge: {
    flexShrink: 0,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#DDF7EC",
  },

  freePriceBadge: {
    backgroundColor: "#E4F8FE",
  },

  priceText: {
    color: "#17202A",
    fontSize: 14,
    fontWeight: "800",
  },

  urgencyBadge: {
    alignSelf: "flex-start",
    marginTop: 11,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#FFE3E5",
  },

  urgencyText: {
    color: "#D92D3A",
    fontSize: 11,
    fontWeight: "800",
  },
});