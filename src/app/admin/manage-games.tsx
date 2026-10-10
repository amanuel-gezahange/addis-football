import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

type UserRole = "admin" | "organizer" | "player";

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
  spots_left: number;
  status: string;
  image_url: string | null;
  created_by: string | null;
};

export default function ManageGamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadGames();
    }, [])
  );

  async function loadGames() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log(
        "Manage games auth error:",
        userError?.message || "No user"
      );

      setGames([]);
      setRole(null);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.log(
        "Role check error:",
        profileError.message
      );

      setGames([]);
      setRole(null);
      setLoading(false);
      return;
    }

    const userRole =
      profile?.role as UserRole | undefined;

    if (
      userRole !== "admin" &&
      userRole !== "organizer"
    ) {
      console.log(
        "User does not have permission to manage games."
      );

      setGames([]);
      setRole(userRole || "player");
      setLoading(false);
      return;
    }

    setRole(userRole);

    /*
      ADMIN:
      sees every game.

      ORGANIZER:
      sees only games where
      created_by = their user ID.
    */

    let gamesQuery = supabase
      .from("games")
      .select(`
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
        created_by
      `);

    if (userRole === "organizer") {
      gamesQuery = gamesQuery.eq(
        "created_by",
        user.id
      );
    }

    const { data, error } =
      await gamesQuery.order("id", {
        ascending: false,
      });

    if (error) {
      console.log(
        "Manage games error:",
        error.message
      );

      setGames([]);
      setLoading(false);
      return;
    }

    setGames((data || []) as Game[]);
    setLoading(false);
  }

  function openEditGame(game: Game) {
    router.push({
      pathname: "/admin/edit-game",
      params: {
        id: String(game.id),
      },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading games...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.replace("/(tabs)/profile")
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.primary}
          />

          <Text style={styles.backText}>
            Back
          </Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              Manage Games
            </Text>

            <Text style={styles.subtitle}>
              {role === "admin"
                ? "Manage all football games"
                : "Manage your football games"}
            </Text>
          </View>

          {(role === "admin" ||
            role === "organizer") && (
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.addButtonPressed,
                ]}
                onPress={() =>
                  router.push("/admin/create-game")
                }
              >
                <Ionicons
                  name="add"
                  size={27}
                  color={COLORS.background}
                />
              </Pressable>
            )}
        </View>

        {role === "admin" && (
          <View style={styles.roleBanner}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.primary}
            />

            <Text style={styles.roleBannerText}>
              Admin access — viewing all games
            </Text>
          </View>
        )}

        {role === "organizer" && (
          <View style={styles.roleBanner}>
            <Ionicons
              name="person-outline"
              size={18}
              color={COLORS.primary}
            />

            <Text style={styles.roleBannerText}>
              Organizer access — viewing only your
              games
            </Text>
          </View>
        )}

        {games.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="football-outline"
                size={34}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No games
            </Text>

            <Text style={styles.emptyText}>
              {role === "organizer"
                ? "You haven't created any games yet."
                : "Create your first football game."}
            </Text>

            {(role === "admin" ||
              role === "organizer") && (
                <Pressable
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed &&
                    styles.createButtonPressed,
                  ]}
                  onPress={() =>
                    router.push(
                      "/admin/create-game"
                    )
                  }
                >
                  <Text
                    style={styles.createButtonText}
                  >
                    Create Game
                  </Text>
                </Pressable>
              )}
          </View>
        ) : (
          <View style={styles.gameList}>
            {games.map((game) => {
              const isCancelled =
                game.status === "cancelled";

              const isFull =
                !isCancelled &&
                (game.status === "full" ||
                  game.spots_left <= 0);

              const statusLabel = isCancelled
                ? "Cancelled"
                : isFull
                  ? "Full"
                  : "Available";

              return (
                <View
                  key={game.id}
                  style={[
                    styles.card,
                    isCancelled &&
                    styles.cancelledCard,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.statusBadge,
                        isCancelled
                          ? styles.cancelledBadge
                          : isFull
                            ? styles.fullBadge
                            : styles.availableBadge,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isCancelled
                            ? styles.cancelledDot
                            : isFull
                              ? styles.fullDot
                              : styles.availableDot,
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          isCancelled
                            ? styles.cancelledText
                            : isFull
                              ? styles.fullText
                              : styles.availableText,
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    </View>

                    <Text style={styles.gameId}>
                      #{game.id}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.gameTitle,
                      isCancelled &&
                      styles.cancelledGameTitle,
                    ]}
                  >
                    {game.title}
                  </Text>

                  <Text style={styles.organizer}>
                    by {game.organizer}
                  </Text>

                  <View style={styles.infoRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={COLORS.textSecondary}
                    />

                    <Text style={styles.infoText}>
                      {game.area}
                      {game.distance
                        ? ` • ${game.distance}`
                        : ""}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={COLORS.textSecondary}
                    />

                    <Text style={styles.infoText}>
                      {game.time}
                    </Text>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detail}>
                      <Text
                        style={styles.detailLabel}
                      >
                        Format
                      </Text>

                      <Text
                        style={styles.detailValue}
                      >
                        {game.format}
                      </Text>
                    </View>

                    <View style={styles.detail}>
                      <Text
                        style={styles.detailLabel}
                      >
                        Skill
                      </Text>

                      <Text
                        style={styles.detailValue}
                      >
                        {game.skill}
                      </Text>
                    </View>

                    <View style={styles.detail}>
                      <Text
                        style={styles.detailLabel}
                      >
                        Spots
                      </Text>

                      <Text
                        style={styles.detailValue}
                      >
                        {game.spots_left}
                      </Text>
                    </View>

                    <View style={styles.detail}>
                      <Text
                        style={styles.detailLabel}
                      >
                        Price
                      </Text>

                      <Text
                        style={styles.detailValue}
                      >
                        {game.price} ETB
                      </Text>
                    </View>
                  </View>

                  {isCancelled ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.viewButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        openEditGame(game)
                      }
                    >
                      <Ionicons
                        name="eye-outline"
                        size={20}
                        color={
                          COLORS.textSecondary
                        }
                      />

                      <Text
                        style={
                          styles.viewButtonText
                        }
                      >
                        View Cancelled Game
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color={COLORS.textMuted}
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.editButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        openEditGame(game)
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={COLORS.primary}
                      />

                      <Text
                        style={
                          styles.editButtonText
                        }
                      >
                        Edit Game
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color={COLORS.textMuted}
                      />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 14,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingVertical: 7,
    marginBottom: 14,
  },

  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 4,
  },

  addButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  roleBanner: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    marginBottom: 20,
  },

  roleBannerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 70,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 18,
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 6,
    textAlign: "center",
  },

  createButton: {
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  createButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },

  createButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "800",
  },

  gameList: {
    gap: 16,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 17,
  },

  cancelledCard: {
    borderColor: "#513033",
    opacity: 0.82,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  availableBadge: {
    backgroundColor: "#0A3828",
  },

  fullBadge: {
    backgroundColor: "#38221F",
  },

  cancelledBadge: {
    backgroundColor: "#382021",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  availableDot: {
    backgroundColor: COLORS.success,
  },

  fullDot: {
    backgroundColor: "#FF747A",
  },

  cancelledDot: {
    backgroundColor: "#FF747A",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  availableText: {
    color: "#71E49A",
  },

  fullText: {
    color: "#FF8B90",
  },

  cancelledText: {
    color: "#FF747A",
  },

  gameId: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  gameTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },

  cancelledGameTitle: {
    color: COLORS.textSecondary,
  },

  organizer: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 3,
    marginBottom: 13,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
  },

  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    flexShrink: 1,
  },

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 15,
    gap: 8,
  },

  detail: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },

  editButton: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },

  editButtonText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },

  viewButton: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },

  viewButtonText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.75,
  },

  bottomSpace: {
    height: 40,
  },
});