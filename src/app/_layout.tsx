import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { LanguageProvider } from "../i18n/LanguageContext";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#07111F",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />

        <Stack.Screen name="admin/create-game" />
        <Stack.Screen name="admin/edit-game" />
        <Stack.Screen name="admin/manage-games" />
      </Stack>
    </LanguageProvider>
  );
}