import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../lib/supabase";
import { Game } from "../types/game";

type Props = {
  game: Game;
};

export default function GameCard({ game }: Props) {
  const { t } = useLanguage();

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] =
    useState(false);

  const spotsLeft = Number(game.spotsLeft ?? 0);
  const price = Number(game.price ?? 0);

  const isFull =
    game.status === "full" || spotsLeft <= 0;

  const locationGame = game as Game & {
    city?: string | null;
  };

  const city = String(
    locationGame.city ?? "",
  ).trim();

  const area = String(game.area ?? "").trim();

  const location =
    city &&
    !area
      .toLowerCase()
      .includes(city.toLowerCase())
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
        console.log(
          "Favorite lookup error:",
          error,
        );

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
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            game_id: game.id,
          });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.log(
        "Favorite toggle error:",
        error,
      );

      setIsFavorite(previousFavoriteState);
    } finally {
      setFavoriteLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      {/* TOP */}
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [
            styles.titlePressable,
            pressed && styles.contentPressed,
          ]}
          onPress={openGameDetails}
          accessibilityRole="button"
          accessibilityLabel={t(
            "gameCard.viewGameDetails",
          ).replace("{game}", game.title)}
        >
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {game.title}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={15}
              color="#717171"
            />

            <Text
              style={styles.locationText}
              numberOfLines={1}
            >
              {location}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.favorite,
            pressed &&
              styles.favoritePressed,
          ]}
          onPress={toggleFavorite}
          disabled={favoriteLoading}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? t(
                  "gameCard.removeFromFavorites",
                ).replace(
                  "{game}",
                  game.title,
                )
              : t(
                  "gameCard.saveToFavorites",
                ).replace(
                  "{game}",
                  game.title,
                )
          }
        >
          <Ionicons
            name={
              isFavorite
                ? "heart"
                : "heart-outline"
            }
            size={23}
            color={
              isFavorite
                ? "#18BFF2"
                : "#222222"
            }
          />
        </Pressable>
      </View>

      {/* MIDDLE */}
      <Pressable
        style={({ pressed }) => [
          styles.gameInfoPressable,
          pressed && styles.contentPressed,
        ]}
        onPress={openGameDetails}
        accessibilityRole="button"
        accessibilityLabel={t(
          "gameCard.viewDetailsFor",
        ).replace("{game}", game.title)}
      >
        <View style={styles.middleRow}>
          <View style={styles.timeRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color="#717171"
            />

            <Text style={styles.timeText}>
              {game.time}
            </Text>
          </View>

          <Text
            style={[
              styles.spotsText,
              isFull && styles.fullText,
            ]}
          >
            {isFull
              ? t("gameCard.gameFull")
              : `${spotsLeft} ${t(
                  "gameCard.spotsLeft",
                )}`}
          </Text>
        </View>

        {/* BOTTOM */}
        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            {price === 0
              ? t("gameCard.free")
              : `${price} ETB`}
          </Text>

          <View style={styles.detailsAction}>
            <Text
              style={styles.detailsActionText}
            >
              {t("gameCard.viewDetails")}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color="#087EA4"
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  titlePressable: {
    flex: 1,
    minWidth: 0,
  },

  contentPressed: {
    opacity: 0.65,
  },

  title: {
    color: "#222222",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 24,
  },

  favorite: {
    width: 36,
    height: 36,
    marginTop: -6,
    marginRight: -5,
    alignItems: "center",
    justifyContent: "center",
  },

  favoritePressed: {
    opacity: 0.55,
    transform: [{ scale: 0.92 }],
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },

  locationText: {
    flex: 1,
    color: "#717171",
    fontSize: 14,
    fontWeight: "400",
  },

  gameInfoPressable: {
    width: "100%",
  },

  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },

  timeText: {
    color: "#3F3F3F",
    fontSize: 14,
    fontWeight: "600",
  },

  spotsText: {
    color: "#717171",
    fontSize: 14,
    fontWeight: "600",
  },

  fullText: {
    color: "#C13515",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 17,
  },

  price: {
    color: "#222222",
    fontSize: 17,
    fontWeight: "800",
  },

  detailsAction: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  detailsActionText: {
    color: "#087EA4",
    fontSize: 15,
    fontWeight: "700",
  },
});