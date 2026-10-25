import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { useLanguage } from "../../i18n/LanguageContext";

export default function TabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isDesktopWeb =
    Platform.OS === "web" && width >= 900;

  // Native devices use their real safe-area inset.
  // Web does not need mobile OS safe-area spacing.
  const bottomInset =
    Platform.OS === "web" ? 0 : insets.bottom;

  return (
    <View style={styles.root}>
      {/* Desktop web branding */}
      {isDesktopWeb && (
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons
              name="football"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View>
            <Text style={styles.brandTitle}>
              ADDIS
            </Text>

            <Text style={styles.brandTitle}>
              FOOTBALL
            </Text>
          </View>
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: "#717171",

          tabBarPosition: isDesktopWeb
            ? "left"
            : "bottom",

          /*
           * DESKTOP:
           * Left-side navigation.
           *
           * MOBILE:
           * Bottom navigation extends through the
           * device safe area while keeping the actual
           * controls above the home indicator.
           */
          tabBarStyle: isDesktopWeb
            ? {
                backgroundColor: "#FFFFFF",

                borderRightColor: "#E5E5E5",
                borderRightWidth: 1,
                borderTopWidth: 0,

                width: 230,

                paddingTop: 120,
                paddingHorizontal: 14,
              }
            : {
                backgroundColor: "#FFFFFF",

                borderTopColor: "#E5E5E5",
                borderTopWidth:
                  StyleSheet.hairlineWidth,

                height: 58 + bottomInset,

                paddingTop: 6,
                paddingBottom: bottomInset,

                elevation: 0,
                shadowColor: "transparent",
              },

          /*
           * Don't force a fixed mobile item height.
           * This prevents labels from being clipped
           * on different phone sizes.
           */
          tabBarItemStyle: isDesktopWeb
            ? {
                width: "100%",
                maxHeight: 56,
                borderRadius: 12,
                marginVertical: 4,
              }
            : {
                paddingTop: 2,
              },

          tabBarIconStyle: isDesktopWeb
            ? {
                marginRight: 8,
              }
            : {
                marginTop: 0,
              },

          tabBarLabelStyle: isDesktopWeb
            ? {
                fontSize: 15,
                fontWeight: "700",
              }
            : {
                fontSize: 11,
                fontWeight: "600",
                marginTop: 0,
                marginBottom: 4,
              },

          sceneStyle: {
            backgroundColor: "#FFFFFF",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.games"),

            tabBarIcon: ({
              color,
              focused,
            }) => (
              <Ionicons
                name={
                  focused
                    ? "football"
                    : "football-outline"
                }
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

            tabBarIcon: ({
              color,
              focused,
            }) => (
              <Ionicons
                name={
                  focused
                    ? "calendar"
                    : "calendar-outline"
                }
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

            tabBarIcon: ({
              color,
              focused,
            }) => (
              <Ionicons
                name={
                  focused
                    ? "person"
                    : "person-outline"
                }
                size={23}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  brand: {
    position: "absolute",
    top: 32,
    left: 22,
    zIndex: 100,

    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,

    backgroundColor: COLORS.primary,

    alignItems: "center",
    justifyContent: "center",
  },

  brandTitle: {
    color: "#222222",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 16,
    letterSpacing: 0.7,
  },
});