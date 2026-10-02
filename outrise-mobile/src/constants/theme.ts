import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#000000",
    background: "#FFFFFF",
    backgroundElement: "#F0F0F3",
    backgroundSelected: "#E0E1E6",
    textSecondary: "#60646C",
  },

  dark: {
    // Core backgrounds
    background: "#03060A",
    backgroundElement: "#050B14",
    backgroundSelected: "#060D17",
    backgroundDeep: "#02050A",

    // Text
    text: "#A6AFB6",
    textSecondary: "#89949D",
    textMuted: "#687681",
    textDim: "#46545F",
    textTechnical: "#52626E",

    // Borders / structural UI
    border: "#162636",
    borderSubtle: "#101D2B",
    borderStrong: "#1B334A",

    // Outrise system accent
    accent: "#8c1a35", // Muted crimson
    accentPressed: "#74162C",

    // Echelon progression identity
    echelon: "#54B9FF",
    echelonMuted: "#4B8BB7",
    echelonBorder: "#1B334A",
    echelonGlow: "#168FE5",
    echelonSurface: "#050B13",

    // Zenith competitive identity
    zenith: "#FFB800",
    zenithSurface: "#0F0B04",
    zenithBorder: "#5E4319",

    // Success
    success: "#34D399",
    successSurface: "#10352C",

    // Destructive / dangerous actions
    danger: "#EF4444",
    dangerSurface: "#0D0507",
    dangerSurfacePressed: "#1F0A0E",
    dangerBorder: "#3D1A22",
  },
} as const;

/*
 * A ThemeColor must exist in BOTH the light and dark themes.
 *
 * This type is useful for components that support either theme.
 * Dark-only Outrise colors such as echelon and zenith are intentionally
 * excluded because they do not exist in the light theme.
 */
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "Barlow-Regular",
    display: "BarlowCondensed-Regular",

    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",

    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",

    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },

  default: {
    sans: "Barlow-Regular",
    display: "BarlowCondensed-Regular",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },

  web: {
    sans: "Barlow-Regular",
    display: "BarlowCondensed-Regular",
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

export const TAB_BAR_HEIGHT = 80;
