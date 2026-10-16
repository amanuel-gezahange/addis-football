import { useRouter } from "expo-router";

import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";

import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../i18n/LanguageContext";

type PaymentMethod = "free" | "venue" | "organizer";

export default function CreateGameScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [title, setTitle] = useState("");

  const [organizer, setOrganizer] = useState("Addis Football");

  const [area, setArea] = useState("");

  const [city, setCity] = useState("Addis Ababa");

  const [mapsUrl, setMapsUrl] = useState("");

  const [distance, setDistance] = useState("");

  const [gameDate, setGameDate] = useState("");

  const [startTime, setStartTime] = useState("");

  const [endTime, setEndTime] = useState("");

  const [format, setFormat] = useState("");

  const [skill, setSkill] = useState("Intermediate");

  const [price, setPrice] = useState("");

  const [spots, setSpots] = useState("");

  const [imageUrl, setImageUrl] = useState("");

  // Payment

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("organizer");

  const [paymentProvider, setPaymentProvider] = useState("Telebirr");

  const [paymentPhone, setPaymentPhone] = useState("");

  const [paymentAccountName, setPaymentAccountName] = useState("");

  const [creating, setCreating] = useState(false);

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);

      return;
    }

    Alert.alert(title, message);
  }

  function selectPaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);

    if (method === "free") {
      setPrice("0");
    }

    if (method !== "free" && price === "0") {
      setPrice("");
    }
  }

  function parseAddisDateTime(date: string, time: string) {
    const cleanDate = date.trim();

    const cleanTime = time.trim();

    const dateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!dateMatch) {
      return null;
    }

    const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!timeMatch) {
      return null;
    }

    const year = Number(dateMatch[1]);

    const month = Number(dateMatch[2]);

    const day = Number(dateMatch[3]);

    let hour = Number(timeMatch[1]);

    const minute = Number(timeMatch[2]);

    const period = timeMatch[3].toUpperCase();

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour < 1 ||
      hour > 12 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    if (period === "AM") {
      if (hour === 12) {
        hour = 0;
      }
    } else {
      if (hour !== 12) {
        hour += 12;
      }
    }

    // Addis Ababa uses UTC+3.

    const monthText = String(month).padStart(2, "0");

    const dayText = String(day).padStart(2, "0");

    const hourText = String(hour).padStart(2, "0");

    const minuteText = String(minute).padStart(2, "0");

    const isoString =
      `${year}-${monthText}-${dayText}` + `T${hourText}:${minuteText}:00+03:00`;

    const parsed = new Date(isoString);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  async function createGame() {
    if (
      !title.trim() ||
      !organizer.trim() ||
      !area.trim() ||
      !city.trim() ||
      !gameDate.trim() ||
      !startTime.trim() ||
      !endTime.trim() ||
      !format.trim() ||
      !skill.trim() ||
      !spots.trim()
    ) {
      showMessage(
        t("createGame.missingInformation"),

        t("createGame.completeRequiredFields"),
      );

      return;
    }

    if (paymentMethod !== "free" && !price.trim()) {
      showMessage(
        t("createGame.missingPrice"),

        t("createGame.enterGamePrice"),
      );

      return;
    }

    if (paymentMethod === "organizer") {
      if (!paymentProvider.trim()) {
        showMessage(
          t("createGame.missingPaymentMethod"),

          t("createGame.enterPaymentProvider"),
        );

        return;
      }

      if (!paymentPhone.trim()) {
        showMessage(
          t("createGame.missingPaymentNumber"),

          t("createGame.enterOrganizerPaymentNumber"),
        );

        return;
      }

      if (!paymentAccountName.trim()) {
        showMessage(
          t("createGame.missingAccountName"),

          t("createGame.enterPaymentAccountName"),
        );

        return;
      }
    }

    const numericPrice = paymentMethod === "free" ? 0 : Number(price);

    const numericSpots = Number(spots);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      showMessage(
        t("createGame.invalidPrice"),

        t("createGame.enterValidPrice"),
      );

      return;
    }

    if (paymentMethod !== "free" && numericPrice <= 0) {
      showMessage(
        t("createGame.invalidPrice"),

        t("createGame.paidPriceGreaterThanZero"),
      );

      return;
    }

    if (!Number.isInteger(numericSpots) || numericSpots < 1) {
      showMessage(
        t("createGame.invalidSpots"),

        t("createGame.enterAtLeastOneSpot"),
      );

      return;
    }

    const startDateTime = parseAddisDateTime(
      gameDate,

      startTime,
    );

    const endDateTime = parseAddisDateTime(
      gameDate,

      endTime,
    );

    if (!startDateTime) {
      showMessage(
        t("createGame.invalidStartTime"),

        t("createGame.startTimeFormatHelp"),
      );

      return;
    }

    if (!endDateTime) {
      showMessage(
        t("createGame.invalidEndTime"),

        t("createGame.endTimeFormatHelp"),
      );

      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      showMessage(
        t("createGame.invalidGameTime"),

        t("createGame.endAfterStart"),
      );

      return;
    }

    const displayTime = `${startTime.trim()} to ` + `${endTime.trim()}`;

    try {
      setCreating(true);

      const { error } = await supabase.rpc(
        "create_game",

        {
          p_title: title.trim(),

          p_organizer: organizer.trim(),

          p_area: area.trim(),

          p_city: city.trim(),

          p_maps_url: mapsUrl.trim() || null,

          p_distance: distance.trim(),

          p_time: displayTime,

          p_format: format.trim(),

          p_skill: skill.trim(),

          p_price: numericPrice,

          p_spots_left: numericSpots,

          p_starts_at: startDateTime.toISOString(),

          p_ends_at: endDateTime.toISOString(),

          p_image_url: imageUrl.trim() || null,

          p_payment_method: paymentMethod,

          p_payment_provider:
            paymentMethod === "organizer" ? paymentProvider.trim() : null,

          p_payment_phone:
            paymentMethod === "organizer" ? paymentPhone.trim() : null,

          p_payment_account_name:
            paymentMethod === "organizer" ? paymentAccountName.trim() : null,
        },
      );

      if (error) {
        console.log(
          "Create game error:",

          error.message,
        );

        showMessage(
          t("createGame.couldNotCreateGame"),

          error.message,
        );

        return;
      }

      router.replace("/admin/manage-games");
    } catch (error: any) {
      console.log("Create game error:", error);

      showMessage(
        t("createGame.couldNotCreateGame"),

        error?.message || t("createGame.createErrorFallback"),
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}

      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}

        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}

          keyboardShouldPersistTaps="handled"

          keyboardDismissMode="none"

          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backButton}

            onPress={() => router.replace("/admin/manage-games")}
          >
            <Text style={styles.backText}>← {t("createGame.back")}</Text>
          </Pressable>

          <Text style={styles.title}>{t("createGame.title")}</Text>

          <Text style={styles.subtitle}>{t("createGame.subtitle")}</Text>

          <Field
            label={t("createGame.gameTitle")}

            value={title}

            onChangeText={setTitle}

            placeholder="Bole Friday Night Football"
          />

          <Field
            label={t("createGame.organizer")}

            value={organizer}

            onChangeText={setOrganizer}

            placeholder="Addis Football"
          />

          <Field
            label={t("createGame.area")}

            value={area}

            onChangeText={setArea}

            placeholder="Bole, Addis Ababa"
          />

          <Field
            label="City"

            value={city}

            onChangeText={setCity}

            placeholder="Addis Ababa"
          />

          <Field
            label="Google Maps link (optional)"

            value={mapsUrl}

            onChangeText={setMapsUrl}

            placeholder="https://maps.google.com/..."

            autoCapitalize="none"
          />

          <Field
            label={t("createGame.distance")}

            value={distance}

            onChangeText={setDistance}

            placeholder="2.5 km"
          />

          <View style={styles.scheduleSection}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleTitle}>
                {t("createGame.gameSchedule")}
              </Text>

              <Text style={styles.timezoneBadge}>Addis Ababa</Text>
            </View>

            <Text style={styles.scheduleHint}>
              {t("createGame.scheduleHint")}
            </Text>

            <Field
              label={t("createGame.gameDate")}

              value={gameDate}

              onChangeText={setGameDate}

              placeholder="2026-10-20"

              autoCapitalize="none"
            />

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Field
                  label={t("createGame.startTime")}

                  value={startTime}

                  onChangeText={setStartTime}

                  placeholder="7:00 PM"

                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.timeField}>
                <Field
                  label={t("createGame.endTime")}

                  value={endTime}

                  onChangeText={setEndTime}

                  placeholder="9:00 PM"

                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          <Field
            label={t("createGame.format")}

            value={format}

            onChangeText={setFormat}

            placeholder="6v6"
          />

          <Field
            label={t("createGame.skillLevel")}

            value={skill}

            onChangeText={setSkill}

            placeholder="Intermediate"
          />

          {/* PAYMENT SECTION */}

          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>{t("createGame.payment")}</Text>

            <Text style={styles.paymentHint}>
              {t("createGame.paymentHint")}
            </Text>

            <PaymentOption
              title={t("createGame.free")}

              description={t("createGame.freeDescription")}

              selected={paymentMethod === "free"}

              onPress={() => selectPaymentMethod("free")}
            />

            <PaymentOption
              title={t("createGame.payAtVenue")}

              description={t("createGame.payAtVenueDescription")}

              selected={paymentMethod === "venue"}

              onPress={() => selectPaymentMethod("venue")}
            />

            <PaymentOption
              title={t("createGame.payOrganizerDirectly")}

              description={t("createGame.payOrganizerDescription")}

              selected={paymentMethod === "organizer"}

              onPress={() => selectPaymentMethod("organizer")}
            />
          </View>

          {paymentMethod !== "free" && (
            <Field
              label={t("createGame.priceEtb")}

              value={price}

              onChangeText={setPrice}

              placeholder="300"

              keyboardType="number-pad"
            />
          )}

          {paymentMethod === "organizer" && (
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentDetailsTitle}>
                {t("createGame.organizerPaymentDetails")}
              </Text>

              <Text style={styles.paymentDetailsHint}>
                {t("createGame.organizerPaymentDetailsHint")}
              </Text>

              <Field
                label={t("createGame.paymentMethod")}

                value={paymentProvider}

                onChangeText={setPaymentProvider}

                placeholder="Telebirr"
              />

              <Field
                label={t("createGame.paymentNumber")}

                value={paymentPhone}

                onChangeText={setPaymentPhone}

                placeholder="0912345678"

                keyboardType="phone-pad"
              />

              <Field
                label={t("createGame.accountName")}

                value={paymentAccountName}

                onChangeText={setPaymentAccountName}

                placeholder="Abebe Kebede"
              />
            </View>
          )}

          <Field
            label={t("createGame.availableSpots")}

            value={spots}

            onChangeText={setSpots}

            placeholder="12"

            keyboardType="number-pad"
          />

          <Field
            label={t("createGame.imageUrlOptional")}

            value={imageUrl}

            onChangeText={setImageUrl}

            placeholder="https://..."

            autoCapitalize="none"
          />

          <Pressable
            style={[
              styles.createButton,

              creating && styles.createButtonDisabled,
            ]}

            onPress={createGame}

            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.createButtonText}>
                {t("createGame.title")}
              </Text>
            )}
          </Pressable>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;

  value: string;

  onChangeText: (value: string) => void;

  placeholder: string;

  keyboardType?: "default" | "number-pad" | "phone-pad";

  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function Field({
  label,

  value,

  onChangeText,

  placeholder,

  keyboardType = "default",

  autoCapitalize = "sentences",
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}

        value={value}

        onChangeText={onChangeText}

        placeholder={placeholder}

        placeholderTextColor="#9A9A9A"

        keyboardType={keyboardType}

        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

type PaymentOptionProps = {
  title: string;

  description: string;

  selected: boolean;

  onPress: () => void;
};

function PaymentOption({
  title,

  description,

  selected,

  onPress,
}: PaymentOptionProps) {
  return (
    <Pressable
      onPress={onPress}

      style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>

      <View style={styles.paymentOptionText}>
        <Text
          style={[
            styles.paymentOptionTitle,

            selected && styles.paymentOptionTitleSelected,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.paymentOptionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 10,
  },

  backText: {
    color: "#087EA4",
    fontSize: 14,
    fontWeight: "600",
  },

  title: {
    color: "#222222",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  subtitle: {
    color: "#717171",
    fontSize: 15,
    marginTop: 3,
    marginBottom: 22,
  },

  scheduleSection: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  scheduleHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,
  },

  scheduleTitle: {
    color: "#222222",
    fontSize: 17,
    fontWeight: "700",
  },

  timezoneBadge: {
    color: "#087EA4",
    backgroundColor: "#EAF8FC",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    fontSize: 11,
    fontWeight: "700",
  },

  scheduleHint: {
    color: "#717171",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },

  timeRow: {
    flexDirection: "row",

    gap: 12,
  },

  timeField: {
    flex: 1,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    color: "#222222",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    color: "#222222",
    fontSize: 15,
    paddingHorizontal: 14,
  },

  paymentSection: {
    marginTop: 2,
    marginBottom: 18,
  },

  paymentTitle: {
    color: "#222222",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  paymentHint: {
    color: "#717171",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },

  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    marginBottom: 8,
  },

  paymentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F2FBFE",
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#9A9A9A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  radioOuterSelected: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  paymentOptionText: {
    flex: 1,
  },

  paymentOptionTitle: {
    color: "#222222",
    fontSize: 14,
    fontWeight: "600",
  },

  paymentOptionTitleSelected: {
    color: "#087EA4",
  },

  paymentOptionDescription: {
    color: "#717171",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  paymentDetails: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  paymentDetailsTitle: {
    color: "#222222",
    fontSize: 16,
    fontWeight: "700",
  },

  paymentDetailsHint: {
    color: "#717171",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },

  createButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: "#07111F",
    fontSize: 15,
    fontWeight: "700",
  },

  bottomSpace: {
    height: 28,
  },
});
