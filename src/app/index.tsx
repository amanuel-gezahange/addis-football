import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
} from "react-native";

import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";

type UserRole = "player" | "organizer" | "admin";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [role, setRole] =
    useState<UserRole>("player");

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setIsLoggedIn(false);
          setRole("player");
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);
        loadRole(session.user.id);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsLoggedIn(false);
        setRole("player");
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      await loadRole(session.user.id);
    } catch (error) {
      console.error(
        "Error checking session:",
        error
      );

      setIsLoggedIn(false);
      setLoading(false);
    }
  }

  async function loadRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "Error loading user role:",
          error
        );

        // Safest fallback for an existing account.
        setRole("player");
        return;
      }

      const profileRole = data?.role;

      if (profileRole === "organizer") {
        setRole("organizer");
      } else if (profileRole === "admin") {
        setRole("admin");
      } else {
        setRole("player");
      }
    } catch (error) {
      console.error(
        "Error loading user role:",
        error
      );

      setRole("player");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#07131D",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  if (role === "organizer") {
    return <Redirect href="/(organizer)" />;
  }

  // Keep admins in the existing experience for now.
  // We will build the dedicated admin experience separately.
  if (role === "admin") {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(tabs)" />;
}