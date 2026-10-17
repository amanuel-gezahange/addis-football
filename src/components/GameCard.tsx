import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../lib/supabase";
import { Game } from "../types/game";

type Props = {
  game: Game;
};

/*
 * Default football images.
 *
 * If a game has its own image_url, that image is used.
 * Otherwise, one of these six images is selected based
 * on the game's ID.
 *
 * This keeps the fallback image consistent for each game
 * instead of changing randomly every refresh.
 */
const fallbackImages = [
  require("../../assets/images/game-fallback-1.png"),
  require("../../assets/images/game-fallback-2.png"),
  require("../../assets/images/game-fallback-3.png"),
  require("../../assets/images/game-fallback-4.png"),
  require("../../assets/images/game-fallback-5.png"),
];

export default function GameCard({ game }: Props) {
  const { t } = useLanguage();

  const [isFavorite, setIsFavorite] = useState(false);

  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const spotsLeft = Number(game.spotsLeft ?? 0);

  const price = Number(game.price ?? 0);

  /*
   * Pick a consistent fallback image using the game ID.
   *
   * Example:
   * game 85 -> one image
   * game 86 -> next image
   * game 87 -> next image
   *
   * The same game keeps the same image after refresh.
   */
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

  function openGameDetails() {
    router.push(`/game/${game.id}`);
  }

  async function toggleFavorite() {
    if (favoriteLoading) {
      return;
    }

    setFavoriteLoading(true);

    const previousFavoriteState = isFavorite;

    // Update the heart immediately.
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
    <View style={styles.card}>
      {/* IMAGE */}
      <Pressable
        style={({ pressed }) => [
          styles.imagePressable,
          pressed && styles.contentPressed,
        ]}
        onPress={openGameDetails}
        accessibilityRole="button"
        accessibilityLabel={t("gameCard.viewGameDetails").replace(
          "{game}",
          game.title,
        )}
      >
        <Image
          source={
            game.image
              ? {
                  uri: game.image,
                }
              : fallbackImage
          }
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.imageOverlay} />
      </Pressable>

      {/* HEART */}
      <Pressable
        style={({ pressed }) => [
          styles.favorite,
          pressed && styles.favoritePressed,
        ]}
        onPress={toggleFavorite}
        disabled={favoriteLoading}
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
        style={({ pressed }) => [
          styles.details,
          pressed && styles.contentPressed,
        ]}
        onPress={openGameDetails}
        accessibilityRole="button"
        accessibilityLabel={t("gameCard.viewDetailsFor").replace(
          "{game}",
          game.title,
        )}
      >
        {/* TITLE */}
        <Text style={styles.title} numberOfLines={1}>
          {game.title}
        </Text>

        {/* LOCATION */}
        <View style={styles.metaRow}>
          <Ionicons name="location" size={15} color="#536273" />

          <Text style={styles.metaText} numberOfLines={1}>
            {location}
          </Text>
        </View>

        {/* TIME */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={15} color="#536273" />

          <Text style={styles.metaText} numberOfLines={1}>
            {game.time}
          </Text>
        </View>

        {/* BOTTOM */}
        <View style={styles.bottomRow}>
          <View style={styles.spotsRow}>
            <Ionicons
              name="people-outline"
              size={16}
              color={isFull ? "#C13515" : "#536273"}
            />

            <Text style={[styles.spotsText, isFull && styles.fullText]}>
              {isFull
                ? t("gameCard.gameFull")
                : `${spotsLeft} ${t("gameCard.spotsLeft")}`}
            </Text>
          </View>

          <View
            style={[styles.priceBadge, price === 0 && styles.freePriceBadge]}
          >
            <Text style={styles.priceText}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    borderWidth: 1,
    borderColor: "#E4E8EC",

    marginBottom: 18,

    overflow: "hidden",
  },

  /* FULL-WIDTH IMAGE */

  imagePressable: {
    width: "100%",
    height: 190,

    backgroundColor: "#0B1823",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFill,

    backgroundColor: "rgba(0, 15, 25, 0.06)",
  },

  contentPressed: {
    opacity: 0.78,
  },

  /* FAVORITE */

  favorite: {
    position: "absolute",

    top: 14,
    right: 14,

    width: 40,
    height: 40,

    borderRadius: 20,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "rgba(255,255,255,0.95)",
  },

  favoritePressed: {
    opacity: 0.7,

    transform: [
      {
        scale: 0.92,
      },
    ],
  },

  /* DETAILS */

  details: {
    position: "relative",

    paddingHorizontal: 16,

    paddingTop: 14,

    paddingBottom: 16,
  },

  title: {
    color: "#17202A",

    fontSize: 19,

    fontWeight: "800",

    lineHeight: 24,

    letterSpacing: -0.35,

    paddingRight: 4,
  },

  metaRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    marginTop: 8,
  },

  metaText: {
    flex: 1,

    color: "#536273",

    fontSize: 14,

    fontWeight: "600",
  },

  /* BOTTOM */

  bottomRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,

    marginTop: 16,
  },

  spotsRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    flexShrink: 1,
  },

  spotsText: {
    color: "#334155",

    fontSize: 14,

    fontWeight: "700",
  },

  fullText: {
    color: "#C13515",
  },

  /* PRICE */

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

  /* LOW SPOTS */

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