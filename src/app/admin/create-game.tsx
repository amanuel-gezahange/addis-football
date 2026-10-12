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

export default function CreateGameScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("Addis Football");
  const [area, setArea] = useState("");
  const [distance, setDistance] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [format, setFormat] = useState("");
  const [skill, setSkill] = useState("Intermediate");
  const [price, setPrice] = useState("");
  const [spots, setSpots] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  function parseAddisDateTime(
    date: string,
    time: string
  ) {
    const cleanDate = date.trim();
    const cleanTime = time.trim();

    const dateMatch = cleanDate.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!dateMatch) {
      return null;
    }

    const timeMatch = cleanTime.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    );

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

    /*
      Addis Ababa uses UTC+3.

      We create the timestamp explicitly
      with +03:00 so creating a game from
      Dallas or another country does not
      accidentally use that device's local
      timezone.
    */

    const monthText = String(month).padStart(
      2,
      "0"
    );

    const dayText = String(day).padStart(
      2,
      "0"
    );

    const hourText = String(hour).padStart(
      2,
      "0"
    );

    const minuteText = String(minute).padStart(
      2,
      "0"
    );

    const isoString =
      `${year}-${monthText}-${dayText}` +
      `T${hourText}:${minuteText}:00+03:00`;

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
      !gameDate.trim() ||
      !startTime.trim() ||
      !endTime.trim() ||
      !format.trim() ||
      !skill.trim() ||
      !price.trim() ||
      !spots.trim()
    ) {
      showMessage(
        "Missing information",
        "Please complete all required fields."
      );

      return;
    }

    const numericPrice = Number(price);
    const numericSpots = Number(spots);

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      showMessage(
        "Invalid price",
        "Enter a valid price."
      );

      return;
    }

    if (
      !Number.isInteger(numericSpots) ||
      numericSpots < 1
    ) {
      showMessage(
        "Invalid spots",
        "Enter at least 1 available spot."
      );

      return;
    }

    const startDateTime = parseAddisDateTime(
      gameDate,
      startTime
    );

    const endDateTime = parseAddisDateTime(
      gameDate,
      endTime
    );

    if (!startDateTime) {
      showMessage(
        "Invalid start time",
        "Use YYYY-MM-DD for the date and a time like 7:00 PM."
      );

      return;
    }

    if (!endDateTime) {
      showMessage(
        "Invalid end time",
        "Use YYYY-MM-DD for the date and a time like 9:00 PM."
      );

      return;
    }

    if (
      endDateTime.getTime() <=
      startDateTime.getTime()
    ) {
      showMessage(
        "Invalid game time",
        "End time must be after the start time."
      );

      return;
    }

    const displayTime =
      `${startTime.trim()} to ` +
      `${endTime.trim()}`;

    setCreating(true);

    const { error } = await supabase.rpc(
      "create_game",
      {
        p_title: title.trim(),
        p_organizer: organizer.trim(),
        p_area: area.trim(),
        p_distance: distance.trim(),
        p_time: displayTime,
        p_format: format.trim(),
        p_skill: skill.trim(),
        p_price: numericPrice,
        p_spots_left: numericSpots,
        p_starts_at:
          startDateTime.toISOString(),
        p_ends_at:
          endDateTime.toISOString(),
        p_image_url:
          imageUrl.trim() || null,
      }
    );

    setCreating(false);

    if (error) {
      console.log(
        "Create game error:",
        error.message
      );

      showMessage(
        "Could not create game",
        error.message
      );

      return;
    }

    router.replace("/admin/manage-games");
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.replace(
                "/admin/manage-games"
              )
            }
          >
            <Text style={styles.backText}>
              ← Back
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Create Game
          </Text>

          <Text style={styles.subtitle}>
            Add a new football game
          </Text>

          <Field
            label="Game title"
            value={title}
            onChangeText={setTitle}
            placeholder="Bole Friday Night Football"
          />

          <Field
            label="Organizer"
            value={organizer}
            onChangeText={setOrganizer}
            placeholder="Addis Football"
          />

          <Field
            label="Area"
            value={area}
            onChangeText={setArea}
            placeholder="Bole, Addis Ababa"
          />

          <Field
            label="Distance"
            value={distance}
            onChangeText={setDistance}
            placeholder="2.5 km"
          />

          <View style={styles.scheduleSection}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleTitle}>
                Game Schedule
              </Text>

              <Text style={styles.timezoneBadge}>
                Addis Ababa
              </Text>
            </View>

            <Text style={styles.scheduleHint}>
              Enter the game date and times in
              Addis Ababa time.
            </Text>

            <Field
              label="Game date"
              value={gameDate}
              onChangeText={setGameDate}
              placeholder="2026-10-10"
              autoCapitalize="none"
            />

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Field
                  label="Start time"
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="7:00 PM"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.timeField}>
                <Field
                  label="End time"
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="9:00 PM"
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          <Field
            label="Format"
            value={format}
            onChangeText={setFormat}
            placeholder="6v6"
          />

          <Field
            label="Skill level"
            value={skill}
            onChangeText={setSkill}
            placeholder="Intermediate"
          />

          <Field
            label="Price (ETB)"
            value={price}
            onChangeText={setPrice}
            placeholder="300"
            keyboardType="number-pad"
          />

          <Field
            label="Available spots"
            value={spots}
            onChangeText={setSpots}
            placeholder="12"
            keyboardType="number-pad"
          />

          <Field
            label="Image URL (optional)"
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            autoCapitalize="none"
          />

          <Pressable
            style={[
              styles.createButton,
              creating &&
                styles.createButtonDisabled,
            ]}
            onPress={createGame}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator
                color={COLORS.background}
              />
            ) : (
              <Text
                style={styles.createButtonText}
              >
                Create Game
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
  keyboardType?: "default" | "number-pad";
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
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
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          COLORS.textMuted
        }
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 12,
  },

  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 5,
    marginBottom: 28,
  },

  scheduleSection: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
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
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  timezoneBadge: {
    color: COLORS.primary,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: "800",
  },

  scheduleHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 18,
  },

  timeRow: {
    flexDirection: "row",
    gap: 12,
  },

  timeField: {
    flex: 1,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 15,
  },

  createButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 40,
  },
});