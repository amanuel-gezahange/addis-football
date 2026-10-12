import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import GameCard from "../../components/GameCard";
import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

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
  starts_at: string | null;
  ends_at: string | null;
};

type DiscoverGame = Game & {
  spotsLeft: number;
  image: string | null;
};

type DateOption = {
  key: string;
  day: string;
  date: string;
  fullDate: string;
};

export default function HomeScreen() {
  const { language, t } = useLanguage();

  /*
    Display dates in the selected language,
    but always keep the Gregorian calendar.
  */
  const dateLocale =
    language === "am"
      ? "am-ET-u-ca-gregory"
      : language === "om"
        ? "om-ET-u-ca-gregory"
        : "en-US-u-ca-gregory";

  const [games, setGames] = useState<DiscoverGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  /*
    Generate the next 7 days.

    Database matching still uses the
    Addis Ababa calendar date.
  */
  const dates = useMemo(() => {
    const result: DateOption[] = [];

    const formatter = new Intl.DateTimeFormat(
      dateLocale,
      {
        timeZone: "Africa/Addis_Ababa",
        weekday: "short",
        day: "numeric",
      }
    );

    /*
      Keep this formatter stable because
      this value is used for date matching,
      not for text displayed to the user.
    */
    const keyFormatter =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Addis_Ababa",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

    const longFormatter =
      new Intl.DateTimeFormat(dateLocale, {
        timeZone: "Africa/Addis_Ababa",
        month: "short",
        day: "numeric",
      });

    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(
        now.getTime() +
        i * 24 * 60 * 60 * 1000
      );

      const parts =
        formatter.formatToParts(date);

      const weekday =
        parts.find(
          (part) =>
            part.type === "weekday"
        )?.value || "";

      const dayNumber =
        parts.find(
          (part) =>
            part.type === "day"
        )?.value || "";

      const key =
        keyFormatter.format(date);

      let day = weekday;

      if (i === 0) {
        day = t("discover.today");
      } else if (i === 1) {
        day = t(
          "discover.tomorrow"
        );
      }

      result.push({
        key,
        day,
        date: dayNumber,
        fullDate:
          longFormatter.format(date),
      });
    }

    return result;
  }, [dateLocale, language, t]);

  /*
    Select Today automatically.
  */
  useFocusEffect(
    useCallback(() => {
      if (
        !selectedDate &&
        dates.length > 0
      ) {
        setSelectedDate(
          dates[0].key
        );
      }
    }, [dates, selectedDate])
  );

  /*
    Reload whenever Discover
    receives focus.
  */
  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [])
  );

  async function fetchGames() {
    setLoading(true);

    const now =
      new Date().toISOString();

    const { data, error } =
      await supabase
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
          starts_at,
          ends_at
        `)
        .neq(
          "status",
          "cancelled"
        )
        .not(
          "starts_at",
          "is",
          null
        )
        .gte("starts_at", now)
        .order("starts_at", {
          ascending: true,
        });

    if (error) {
      console.log(
        "Error loading games:",
        error.message
      );

      setGames([]);
      setLoading(false);
      return;
    }

    const mappedGames =
      (data || []).map(
        (game) => ({
          ...game,

          spotsLeft:
            game.spots_left,

          image:
            game.image_url,
        })
      ) as DiscoverGame[];

    setGames(mappedGames);
    setLoading(false);
  }

  function getAddisDateKey(
    timestamp: string
  ) {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Africa/Addis_Ababa",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date(timestamp)
    );
  }

  function formatGameDate(
    timestamp: string
  ) {
    return new Intl.DateTimeFormat(
      dateLocale,
      {
        timeZone:
          "Africa/Addis_Ababa",
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    ).format(
      new Date(timestamp)
    );
  }

  const visibleGames =
    useMemo(() => {
      const cleanSearch =
        search
          .trim()
          .toLowerCase();

      return games.filter(
        (game) => {
          if (!game.starts_at) {
            return false;
          }

          const gameDate =
            getAddisDateKey(
              game.starts_at
            );

          const matchesDate =
            !selectedDate ||
            gameDate ===
            selectedDate;

          const matchesSearch =
            !cleanSearch ||
            game.title
              .toLowerCase()
              .includes(
                cleanSearch
              ) ||
            game.area
              .toLowerCase()
              .includes(
                cleanSearch
              ) ||
            game.organizer
              .toLowerCase()
              .includes(
                cleanSearch
              );

          return (
            matchesDate &&
            matchesSearch
          );
        }
      );
    }, [
      games,
      search,
      selectedDate,
    ]);

  const selectedDateLabel =
    dates.find(
      (item) =>
        item.key ===
        selectedDate
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <View
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}

          <View
            style={styles.header}
          >
            <View>
              <Text
                style={styles.title}
              >
                {t(
                  "discover.title"
                )}
              </Text>

              <Pressable
                style={
                  styles.location
                }
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={
                    COLORS.textSecondary
                  }
                />

                <Text
                  style={
                    styles.locationText
                  }
                >
                  Addis Ababa
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={17}
                  color={
                    COLORS.textSecondary
                  }
                />
              </Pressable>
            </View>

            <Pressable
              style={
                styles.notificationButton
              }
            >
              <Ionicons
                name="notifications"
                size={24}
                color={COLORS.text}
              />

              <View
                style={
                  styles.notificationDot
                }
              />
            </Pressable>
          </View>

          {/* SEARCH */}

          <View
            style={
              styles.searchRow
            }
          >
            <View
              style={
                styles.searchBox
              }
            >
              <Ionicons
                name="search"
                size={24}
                color={COLORS.text}
              />

              <TextInput
                value={search}
                onChangeText={
                  setSearch
                }
                placeholder={t(
                  "discover.searchPlaceholder"
                )}
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.searchInput
                }
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={
                  COLORS.primary
                }
              />

              {search.length >
                0 && (
                  <Pressable
                    onPress={() =>
                      setSearch("")
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={21}
                      color={
                        COLORS.textMuted
                      }
                    />
                  </Pressable>
                )}
            </View>

            <Pressable
              style={
                styles.filterButton
              }
            >
              <Ionicons
                name="options-outline"
                size={25}
                color={
                  COLORS.primary
                }
              />
            </Pressable>
          </View>

          {/* DATE SELECTOR */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.dateRow
            }
          >
            {dates.map(
              (item) => {
                const active =
                  selectedDate ===
                  item.key;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() =>
                      setSelectedDate(
                        item.key
                      )
                    }
                    style={({ pressed }) => [
                      styles.dateButton,

                      active &&
                      styles.dateButtonActive,

                      pressed &&
                      styles.dateButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateDay,

                        active &&
                        styles.dateTextActive,
                      ]}
                    >
                      {item.day}
                    </Text>

                    <Text
                      style={[
                        styles.dateNumber,

                        active &&
                        styles.dateTextActive,
                      ]}
                    >
                      {item.date}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          {/* SELECTED DATE */}

          {selectedDateLabel && (
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  {t(
                    "discover.games"
                  )}
                </Text>

                <Text
                  style={
                    styles.sectionDate
                  }
                >
                  {
                    selectedDateLabel.fullDate
                  }
                </Text>
              </View>

              {!loading && (
                <View
                  style={
                    styles.gameCountBadge
                  }
                >
                  <Text
                    style={
                      styles.gameCount
                    }
                  >
                    {
                      visibleGames.length
                    }{" "}
                    {visibleGames.length ===
                      1
                      ? t(
                        "discover.game"
                      )
                      : t(
                        "discover.gamesCount"
                      )}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* LOADING */}

          {loading && (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                {t(
                  "discover.findingGames"
                )}
              </Text>
            </View>
          )}

          {/* EMPTY */}

          {!loading &&
            visibleGames.length ===
            0 && (
              <View
                style={
                  styles.emptyContainer
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Ionicons
                    name="football-outline"
                    size={32}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {t(
                    "discover.noGamesFound"
                  )}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {search.trim()
                    ? t(
                      "discover.noSearchResults"
                    )
                    : t(
                      "discover.noGamesForDay"
                    )}
                </Text>
              </View>
            )}

          {/* GAME CARDS */}

          {!loading &&
            visibleGames.map(
              (game) => (
                <View
                  key={game.id}
                  style={
                    styles.gameWrapper
                  }
                >
                  {game.starts_at && (
                    <Text
                      style={
                        styles.gameDateLabel
                      }
                    >
                      {formatGameDate(
                        game.starts_at
                      )}
                    </Text>
                  )}

                  <GameCard
                    game={game}
                  />
                </View>
              )
            )}

          <View
            style={{
              height: 30,
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 18,
    },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 22,
    },

    title: {
      color: COLORS.text,
      fontSize: 36,
      fontWeight: "800",
      letterSpacing: -1,
    },

    location: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 5,
    },

    locationText: {
      color:
        COLORS.textSecondary,
      fontSize: 17,
      fontWeight: "500",
    },

    notificationButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent:
        "center",
      alignItems: "center",
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    notificationDot: {
      position: "absolute",
      right: 8,
      top: 7,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        COLORS.danger,
      borderWidth: 2,
      borderColor:
        COLORS.background,
    },

    searchRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 20,
    },

    searchBox: {
      flex: 1,
      height: 58,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 30,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      backgroundColor:
        COLORS.surface,
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
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.surface,
      alignItems: "center",
      justifyContent:
        "center",
    },

    dateRow: {
      gap: 9,
      paddingBottom: 22,
    },

    dateButton: {
      minWidth: 76,
      minHeight: 68,
      paddingHorizontal: 15,
      borderRadius: 22,
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      justifyContent:
        "center",
      alignItems: "center",
    },

    dateButtonActive: {
      backgroundColor:
        COLORS.primary,
      borderColor:
        COLORS.primary,
    },

    dateButtonPressed: {
      opacity: 0.82,
    },

    dateDay: {
      color:
        COLORS.textSecondary,
      fontWeight: "700",
      fontSize: 12,
    },

    dateNumber: {
      color: COLORS.text,
      fontWeight: "800",
      fontSize: 19,
      marginTop: 2,
    },

    dateTextActive: {
      color:
        COLORS.background,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-end",
      marginBottom: 16,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 23,
      fontWeight: "800",
    },

    sectionDate: {
      color:
        COLORS.textMuted,
      fontSize: 13,
      marginTop: 2,
    },

    gameCountBadge: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    gameCount: {
      color:
        COLORS.primary,
      fontSize: 13,
      fontWeight: "700",
    },

    loadingContainer: {
      alignItems: "center",
      paddingVertical: 60,
    },

    loadingText: {
      color:
        COLORS.textSecondary,
      fontSize: 14,
      marginTop: 13,
    },

    emptyContainer: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 25,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      color: COLORS.text,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 17,
    },

    emptyText: {
      color:
        COLORS.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      marginTop: 7,
    },

    gameWrapper: {
      marginBottom: 16,
    },

    gameDateLabel: {
      color:
        COLORS.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 7,
      marginLeft: 3,
      textTransform:
        "uppercase",
    },
  });