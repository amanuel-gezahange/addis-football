import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Calendar } from "react-native-calendars";
import { Modal } from "react-native";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import GameCard from "../../components/GameCard";
import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

type Game = {
  id: string;
  title: string;
  organizer: string;
  area: string;
  distance: string | null;
  time: string;
  format: string;
  skill: string;
  price: number;
  spots_left: number;
  status: "available" | "full";
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  payment_method: "free" | "venue" | "organizer";
  payment_provider: string | null;
  payment_phone: string | null;
  payment_account_name: string | null;
  city: string | null;
  maps_url: string | null;
};

type DiscoverGame = Game & {
  spotsLeft: number;
  image: string;
};

type DateOption = {
  key: string;
  day: string;
  date: string;
  fullDate: string;
};

const CITY_OPTIONS = [
  "All Ethiopia",
  "Addis Ababa",
  "Adama",
  "Bahir Dar",
  "Bishoftu",
  "Dire Dawa",
  "Gondar",
  "Hawassa",
  "Jimma",
  "Mekelle",
  "Dessie",
  "Arba Minch",
  "Shashamane",
  "Harar",
] as const;

export default function HomeScreen() {
  const { language, t } = useLanguage();
  const { width } = useWindowDimensions();

  const isDesktopWeb = Platform.OS === "web" && width >= 900;

  /*
    Display dates in the selected language,
    but always keep the Gregorian calendar.
  */
  const dateLocale = "en-US-u-ca-gregory";

  const [games, setGames] = useState<DiscoverGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Addis Ababa");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [sortBy, setSortBy] = useState<"soonest" | "price_low" | "spots">(
    "soonest",
  );

  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<"free" | "paid" | null>(null);

  /*
    Generate the next 7 days.

    Database matching still uses the
    Addis Ababa calendar date.
  */
  const dates = useMemo(() => {
    const result: DateOption[] = [];

    const keyFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);

      const key = keyFormatter.format(date);

      let day = new Intl.DateTimeFormat(
        language === "am" ? "am-ET" : language === "om" ? "om-ET" : "en-US",
        {
          timeZone: "Africa/Addis_Ababa",
          weekday: "short",
        },
      ).format(date);

      if (i === 0) {
        day = t("discover.today");
      } else if (i === 1) {
        day = t("discover.tomorrow");
      }

      if (language === "am" || language === "om") {
        const ethiopian = getEthiopianDate(date, language);

        result.push({
          key,
          day,
          date: String(ethiopian.day),
          fullDate: ethiopian.label,
        });
      } else {
        result.push({
          key,
          day,
          date: new Intl.DateTimeFormat("en-US", {
            timeZone: "Africa/Addis_Ababa",
            day: "numeric",
          }).format(date),
          fullDate: new Intl.DateTimeFormat("en-US", {
            timeZone: "Africa/Addis_Ababa",
            month: "short",
            day: "numeric",
          }).format(date),
        });
      }
    }

    return result;
  }, [language, t]);

  /*
    Select Today automatically.
  */

  /*
    Reload whenever Discover
    receives focus.
  */
  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, []),
  );

  async function fetchGames() {
    setLoading(true);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("games")
      .select(
        `
          id,
          title,
          organizer,
          area,
          city,
          maps_url,
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
          payment_provider,
          payment_phone,
          payment_account_name
        `,
      )
      .neq("status", "cancelled")
      .not("starts_at", "is", null)
      .gte("starts_at", now)
      .order("starts_at", {
        ascending: true,
      });

    if (error) {
      console.log("Error loading games:", error.message);

      setGames([]);
      setLoading(false);
      return;
    }

    const mappedGames = (data || []).map((game) => ({
      ...game,

      id: String(game.id),

      spotsLeft: game.spots_left,

      image: game.image_url ?? "",
    })) as DiscoverGame[];

    setGames(mappedGames);
    setLoading(false);
  }

  function getAddisDateKey(timestamp: string) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));
  }

  function formatGameDate(timestamp: string) {
    if (language === "am" || language === "om") {
      return getEthiopianDate(timestamp, language).label;
    }

    return new Intl.DateTimeFormat(dateLocale, {
      timeZone: "Africa/Addis_Ababa",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  }

  const visibleGames = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return games
      .filter((game) => {
        if (!game.starts_at) {
          return false;
        }

        const gameDate = getAddisDateKey(game.starts_at);

        // City
        if (
          selectedCity !== "All Ethiopia" &&
          (game.city || "Addis Ababa").toLowerCase() !==
            selectedCity.toLowerCase()
        ) {
          return false;
        }

        // Date
        if (!cleanSearch && selectedDate && gameDate !== selectedDate) {
          return false;
        }

        // Skill
        if (
          skillFilter &&
          game.skill.toLowerCase() !== skillFilter.toLowerCase()
        ) {
          return false;
        }

        // Format
        if (
          formatFilter &&
          game.format.toLowerCase() !== formatFilter.toLowerCase()
        ) {
          return false;
        }

        // Free / Paid
        if (priceFilter === "free" && game.payment_method !== "free") {
          return false;
        }

        if (priceFilter === "paid" && game.payment_method === "free") {
          return false;
        }

        // Search
        if (cleanSearch) {
          const searchableText = [
            game.title,
            game.organizer,
            game.area,
            game.city,
            game.distance,
            game.time,
            game.format,
            game.skill,
            game.price,
            game.payment_method !== "free" ? `${game.price} ETB` : null,
            game.payment_method !== "free" ? `${game.price} birr` : null,
            game.payment_method !== "free" ? "ETB" : null,
            game.payment_method !== "free" ? "birr" : null,
            game.spots_left,
            `${game.spots_left} spots`,
            `${game.spots_left} spots left`,
            game.payment_method,
            game.payment_provider,
            game.payment_phone,
            game.payment_account_name,
            game.payment_method === "free" ? "free" : null,
            game.payment_method === "venue" ? "venue pay at venue" : null,
            game.payment_method === "organizer"
              ? "organizer pay organizer"
              : null,
          ]
            .filter((value) => value !== null && value !== undefined)
            .map((value) => String(value).toLowerCase())
            .join(" ");

          if (!searchableText.includes(cleanSearch)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_low") {
          return a.price - b.price;
        }

        if (sortBy === "spots") {
          return b.spots_left - a.spots_left;
        }

        // Default: soonest
        const aTime = a.starts_at
          ? new Date(a.starts_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        const bTime = b.starts_at
          ? new Date(b.starts_at).getTime()
          : Number.MAX_SAFE_INTEGER;

        return aTime - bTime;
      });
  }, [
    games,
    search,
    selectedDate,
    selectedCity,
    skillFilter,
    formatFilter,
    priceFilter,
    sortBy,
  ]);

  const selectedDateLabel = useMemo(() => {
    const quickDate = dates.find((item) => item.key === selectedDate);

    if (quickDate) {
      return quickDate;
    }

    if (!selectedDate) {
      return null;
    }

    const [year, month, day] = selectedDate.split("-").map(Number);

    const selected = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    return {
      key: selectedDate,
      day: "",
      date: String(day),
      fullDate:
        language === "am" || language === "om"
          ? getEthiopianDate(selected, language).label
          : new Intl.DateTimeFormat(dateLocale, {
              timeZone: "Africa/Addis_Ababa",
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(selected),
    };
  }, [dates, selectedDate, dateLocale, language]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktopWeb && styles.scrollContentDesktop,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t("discover.title")}</Text>

              <Pressable
                style={styles.location}
                onPress={() => setCityModalVisible(true)}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />

                <Text style={styles.locationText}>{selectedCity}</Text>

                <Ionicons
                  name="chevron-down"
                  size={17}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>

            <Pressable style={styles.notificationButton}>
              <Ionicons name="notifications" size={24} color={COLORS.text} />

              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          {/* SEARCH */}

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={24} color={COLORS.text} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("discover.searchPlaceholder")}
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
                (skillFilter ||
                  formatFilter ||
                  priceFilter ||
                  sortBy !== "soonest") &&
                  styles.filterButtonActive,
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons
                name="options-outline"
                size={25}
                color={
                  skillFilter ||
                  formatFilter ||
                  priceFilter ||
                  sortBy !== "soonest"
                    ? "#fff"
                    : COLORS.primary
                }
              />
            </Pressable>

            <Pressable
              style={styles.filterButton}
              onPress={() => setCalendarVisible(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={25}
                color={COLORS.primary}
              />
            </Pressable>
          </View>

          {/* DATE SELECTOR */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {dates.map((item) => {
              const active = selectedDate === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSelectedDate(item.key)}
                  style={({ pressed }) => [
                    styles.dateButton,

                    active && styles.dateButtonActive,

                    pressed && styles.dateButtonPressed,
                  ]}
                >
                  <Text
                    style={[styles.dateDay, active && styles.dateTextActive]}
                  >
                    {item.day}
                  </Text>

                  <Text
                    style={[styles.dateNumber, active && styles.dateTextActive]}
                  >
                    {item.date}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SELECTED DATE */}

          {selectedDateLabel && (
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{t("discover.games")}</Text>

                <Text style={styles.sectionDate}>
                  {selectedDateLabel.fullDate}
                </Text>
              </View>

              {!loading && (
                <View style={styles.gameCountBadge}>
                  <Text style={styles.gameCount}>
                    {visibleGames.length}{" "}
                    {visibleGames.length === 1
                      ? t("discover.game")
                      : t("discover.gamesCount")}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* LOADING */}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />

              <Text style={styles.loadingText}>
                {t("discover.findingGames")}
              </Text>
            </View>
          )}

          {/* EMPTY */}

          {!loading && visibleGames.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="football-outline"
                  size={32}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {t("discover.noGamesFound")}
              </Text>

              <Text style={styles.emptyText}>
                {search.trim()
                  ? t("discover.noSearchResults")
                  : t("discover.noGamesForDay")}
              </Text>
            </View>
          )}

          {/* GAME CARDS */}

          {!loading &&
            visibleGames.map((game) => (
              <View key={game.id} style={styles.gameWrapper}>
                {game.starts_at && (
                  <Text style={styles.gameDateLabel}>
                    {formatGameDate(game.starts_at)}
                  </Text>
                )}

                <GameCard game={game} />
              </View>
            ))}

          <View
            style={{
              height: 30,
            }}
          />
        </ScrollView>
        <Modal
          visible={cityModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCityModalVisible(false)}
        >
          <Pressable
            style={styles.calendarOverlay}
            onPress={() => setCityModalVisible(false)}
          >
            <Pressable
              style={styles.calendarModal}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Choose a city</Text>
                <Pressable
                  style={styles.calendarCloseButton}
                  onPress={() => setCityModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.cityList}
                showsVerticalScrollIndicator={false}
              >
                {CITY_OPTIONS.map((city) => {
                  const selected = city === selectedCity;

                  return (
                    <Pressable
                      key={city}
                      style={[
                        styles.cityOption,
                        selected && styles.cityOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedCity(city);
                        setCityModalVisible(false);
                      }}
                    >
                      <Ionicons
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={21}
                        color={selected ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.cityOptionText,
                          selected && styles.cityOptionTextSelected,
                        ]}
                      >
                        {city}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
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
                      ? "የወደፊት ቀን ጨዋታ ይፈልጉ"
                      : language === "om"
                        ? "Guyyaa fuulduraa irratti tapha barbaadi"
                        : "Find games on any future date"}
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
        <Modal
          visible={filterModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.filterOverlay}>
            <View style={styles.filterSheet}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>
                    {t("discover.filterGames")}
                  </Text>

                  <Pressable onPress={() => setFilterModalVisible(false)}>
                    <Ionicons name="close" size={26} color={COLORS.text} />
                  </Pressable>
                </View>
             
              <Text style={styles.filterSectionTitle}>
                {t("discover.sortBy")}
              </Text>

              {[
                ["soonest", t("discover.soonest")],
                ["price_low", t("discover.lowestPrice")],
                ["spots", t("discover.mostSpotsAvailable")],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  style={styles.filterOption}
                  onPress={() =>
                    setSortBy(value as "soonest" | "price_low" | "spots")
                  }
                >
                  <Text style={styles.filterOptionText}>{label}</Text>

                  <Ionicons
                    name={
                      sortBy === value ? "radio-button-on" : "radio-button-off"
                    }
                    size={22}
                    color={COLORS.primary}
                  />
                </Pressable>
              ))}

              <Text style={styles.filterSectionTitle}>
                {t("discover.price")}
              </Text>

              {[
                [null, t("discover.anyPrice")],
                ["free", t("discover.free")],
                ["paid", t("discover.paid")],
              ].map(([value, label]) => (
                <Pressable
                  key={label}
                  style={styles.filterOption}
                  onPress={() =>
                    setPriceFilter(value as "free" | "paid" | null)
                  }
                >
                  <Text style={styles.filterOptionText}>{label}</Text>

                  <Ionicons
                    name={
                      priceFilter === value
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={COLORS.primary}
                  />
                </Pressable>
              ))}
              <Text style={styles.filterSectionTitle}>
                {t("discover.skillLevel")}
              </Text>

              {[
                [null, t("discover.anySkill")],
                ["Beginner", t("discover.beginner")],
                ["Intermediate", t("discover.intermediate")],
                ["Advanced", t("discover.advanced")],
              ].map(([value, label]) => (
                <Pressable
                  key={label}
                  style={styles.filterOption}
                  onPress={() => setSkillFilter(value)}
                >
                  <Text style={styles.filterOptionText}>{label}</Text>

                  <Ionicons
                    name={
                      skillFilter === value
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={COLORS.primary}
                  />
                </Pressable>
              ))}
              <Text style={styles.filterSectionTitle}>
                {t("discover.gameFormat")}
              </Text>

              {[
                [null, t("discover.anyFormat")],
                ["5v5", "5v5"],
                ["6v6", "6v6"],
                ["7v7", "7v7"],
                ["11v11", "11v11"],
              ].map(([value, label]) => (
                <Pressable
                  key={label}
                  style={styles.filterOption}
                  onPress={() => setFormatFilter(value)}
                >
                  <Text style={styles.filterOptionText}>{label}</Text>

                  <Ionicons
                    name={
                      formatFilter === value
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={COLORS.primary}
                  />
                </Pressable>
              ))}
              <View style={styles.filterActions}>
                <Pressable
                  style={styles.resetFilterButton}
                  onPress={() => {
                    setSortBy("soonest");
                    setSkillFilter(null);
                    setFormatFilter(null);
                    setPriceFilter(null);
                  }}
                >
                  <Text style={styles.resetFilterText}>{t("discover.reset")}</Text>
                </Pressable>

                <Pressable
                  style={styles.showGamesButton}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.showGamesText}>
                    {t("discover.showGames")}
                  </Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
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
      ? [
          "Wiixata",
          "Kibxata",
          "Roobii",
          "Kamiisa",
          "Jimaata",
          "Sanbata",
          "Dilbata",
        ]
      : ["ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሁድ"];

  const daysInMonth =
    viewMonth <= 12 ? 30 : isEthiopianLeapYear(viewYear) ? 6 : 5;

  const firstDate = ethiopianToGregorianKey(viewYear, viewMonth, 1);

  const [firstYear, firstMonth, firstDay] = firstDate.split("-").map(Number);

  const firstWeekday =
    (new Date(Date.UTC(firstYear, firstMonth - 1, firstDay, 12)).getUTCDay() +
      6) %
    7;

  const cells: Array<number | null> = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  // Always render 6 calendar rows.
  // This keeps the popup the same height for every Ethiopian month,
  // including Pagume.
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
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  filterSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    maxHeight: "85%",
  },

  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },

  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 18,
    marginBottom: 6,
  },

  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },

  filterOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },

  filterActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },

  resetFilterButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  resetFilterText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  showGamesButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  showGamesText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  scrollContentDesktop: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
    fontSize: 17,
    fontWeight: "500",
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  notificationDot: {
    position: "absolute",
    right: 8,
    top: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.background,
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

  dateRow: {
    gap: 9,
    paddingBottom: 22,
  },

  dateButton: {
    minWidth: 76,
    minHeight: 68,
    paddingHorizontal: 15,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  dateButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  dateButtonPressed: {
    opacity: 0.82,
  },

  dateDay: {
    color: COLORS.textSecondary,
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
    color: COLORS.background,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: "800",
  },

  sectionDate: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  gameCountBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  gameCount: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },

  loadingText: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 17,
  },

  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },

  gameWrapper: {
    marginBottom: 16,
  },

  gameDateLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
    marginLeft: 3,
    textTransform: "uppercase",
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
  cityList: {
    maxHeight: 460,
  },

  cityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  cityOptionSelected: {
    backgroundColor: COLORS.background,
  },

  cityOptionText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },

  cityOptionTextSelected: {
    color: COLORS.primary,
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
});
