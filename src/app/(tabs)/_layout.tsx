import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";

export default function TabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const bottomInset =
    Platform.OS === "android" ? insets.bottom : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,

          height: 60 + bottomInset,
          paddingTop: 4,
          paddingBottom: bottomInset + 8,
        },

        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,

        tabBarItemStyle: {
          paddingTop: 0,
        },

        tabBarIconStyle: {
          marginTop: -3,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.discover"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "football" : "football-outline"}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: t("tabs.bookings"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={23}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}