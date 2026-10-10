/**
 * Global Addis Football theme.
 *
 * Main visual direction:
 * Midnight Blue + Electric Cyan
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#0F172A",
    background: "#F5F8FC",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E6F8FF",
    textSecondary: "#64748B",

    surface: "#FFFFFF",
    surfaceSoft: "#EFF6FB",
    border: "#D8E3EE",

    primary: "#08A9DC",
    primaryText: "#FFFFFF",

    textMuted: "#94A3B8",

    success: "#22C55E",
    successDark: "#15803D",

    danger: "#EF4444",
    dangerDark: "#DC2626",

    skill: "#163B67",
    skillText: "#DCEEFF",
  },

  dark: {
    // Main text
    text: "#F7FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",

    // Midnight backgrounds
    background: "#07111F",
    backgroundElement: "#101D2E",
    backgroundSelected: "#16263A",

    // Cards / surfaces
    surface: "#101D2E",
    surfaceSoft: "#16263A",
    border: "#24364B",

    // Addis Football primary
    primary: "#18C8FF",
    primaryText: "#07111F",

    // Status colors
    success: "#22C55E",
    successDark: "#15803D",

    danger: "#EF4444",
    dangerDark: "#DC2626",

    // Skill badge
    skill: "#163B67",
    skillText: "#DCEEFF",
  },
} as const;

export type ThemeColor =
  keyof typeof Colors.light &
  keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS system font */
    sans: "system-ui",

    /** iOS serif font */
    serif: "ui-serif",

    /** iOS rounded font */
    rounded: "ui-rounded",

    /** iOS monospace font */
    mono: "ui-monospace",
  },

  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },

  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset =
  Platform.select({
    ios: 50,
    android: 80,
  }) ?? 0;

export const MaxContentWidth = 800;