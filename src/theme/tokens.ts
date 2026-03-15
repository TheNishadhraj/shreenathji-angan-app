// ─── Glassmorphism Design Tokens ────────────────────────────────

export const palette = {
  primary: "#0D9488",
  primaryLight: "#14B8A6",
  primaryDark: "#0F766E",
  accent: "#D4A574",
  accentLight: "#E8C9A0",
  accentDark: "#C8956D",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  purple: "#8B5CF6",
  coral: "#F43F5E",
  white: "#FFFFFF",
  black: "#000000",
};

export const glass = {
  light: {
    background: "#F5F0EB",
    surface: "rgba(255,255,255,0.72)",
    card: "rgba(255,255,255,0.55)",
    cardSolid: "#FFFFFF",
    cardBorder: "rgba(255,255,255,0.80)",
    inputBg: "rgba(255,255,255,0.50)",
    inputBorder: "rgba(0,0,0,0.08)",
    overlay: "rgba(0,0,0,0.04)",
    tabBar: "rgba(255,255,255,0.78)",
    tabBarBorder: "rgba(0,0,0,0.06)",
    shimmer: "rgba(255,255,255,0.6)",
    heroGradient: ["#E8DDD5", "#F5F0EB"] as readonly string[],
    text: "#1A1A2E",
    textSecondary: "rgba(26,26,46,0.65)",
    textMuted: "rgba(26,26,46,0.38)",
    border: "rgba(0,0,0,0.06)",
    divider: "rgba(0,0,0,0.04)",
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    accent: "#C8956D",
    success: palette.success,
    danger: palette.danger,
    warning: palette.warning,
    info: palette.info,
    secondary: "#1E293B",
  },
  dark: {
    background: "#0B0B16",
    surface: "rgba(255,255,255,0.07)",
    card: "rgba(255,255,255,0.08)",
    cardSolid: "#1C1C2E",
    cardBorder: "rgba(255,255,255,0.12)",
    inputBg: "rgba(255,255,255,0.06)",
    inputBorder: "rgba(255,255,255,0.10)",
    overlay: "rgba(255,255,255,0.03)",
    tabBar: "rgba(18,18,30,0.92)",
    tabBarBorder: "rgba(255,255,255,0.08)",
    shimmer: "rgba(255,255,255,0.10)",
    heroGradient: ["#151524", "#0B0B16"] as readonly string[],
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.65)",
    textMuted: "rgba(255,255,255,0.38)",
    border: "rgba(255,255,255,0.06)",
    divider: "rgba(255,255,255,0.04)",
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    accent: "#D4A574",
    success: palette.success,
    danger: palette.danger,
    warning: palette.warning,
    info: palette.info,
    secondary: "#E2E8F0",
  },
};

export type GlassColors = typeof glass.light;

// Legacy alias for backward compat
export const colors = {
  ...palette,
  background: glass.light.background,
  card: glass.light.cardSolid,
  text: glass.light.text,
  textSecondary: glass.light.textSecondary,
  textMuted: glass.light.textMuted,
  border: glass.light.border,
  secondary: glass.light.secondary,
};

import { Platform } from "react-native";

const webShadow = (shadow: string) =>
  Platform.OS === "web" ? ({ boxShadow: shadow } as any) : {};

export const shadows = {
  glass: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    ...webShadow("0 8px 24px rgba(0,0,0,0.08)"),
  },
  soft: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    ...webShadow("0 4px 12px rgba(0,0,0,0.05)"),
  },
  glow: {
    shadowColor: palette.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    ...webShadow(`0 4px 16px ${palette.primary}4D`),
  },
  xs: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    ...webShadow("0 2px 4px rgba(0,0,0,0.05)"),
  },
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    ...webShadow("0 4px 12px rgba(0,0,0,0.05)"),
  },
  md: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    ...webShadow("0 8px 24px rgba(0,0,0,0.08)"),
  },
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  hero: { fontSize: 32, fontFamily: "Poppins_700Bold" as const, lineHeight: 40 },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold" as const, lineHeight: 36 },
  h2: { fontSize: 24, fontFamily: "Poppins_600SemiBold" as const, lineHeight: 32 },
  h3: { fontSize: 20, fontFamily: "Poppins_600SemiBold" as const, lineHeight: 28 },
  body: { fontSize: 16, fontFamily: "Inter_400Regular" as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontFamily: "Inter_600SemiBold" as const, lineHeight: 24 },
  caption: { fontSize: 14, fontFamily: "Inter_400Regular" as const, lineHeight: 20 },
  captionBold: { fontSize: 14, fontFamily: "Inter_600SemiBold" as const, lineHeight: 20 },
  small: { fontSize: 12, fontFamily: "Inter_600SemiBold" as const, lineHeight: 16 },
  tiny: { fontSize: 11, fontFamily: "Inter_400Regular" as const, lineHeight: 14 },
};

export const avatarGradients: readonly (readonly [string, string])[] = [
  ["#0D9488", "#14B8A6"],
  ["#8B5CF6", "#A78BFA"],
  ["#F97316", "#FDBA74"],
  ["#3B82F6", "#60A5FA"],
  ["#F43F5E", "#FDA4AF"],
  ["#D4A574", "#E8C9A0"],
  ["#10B981", "#34D399"],
  ["#EC4899", "#F472B6"],
];

export const cardGradients: readonly (readonly [string, string])[] = [
  ["#0D9488", "#14B8A6"],
  ["#F97316", "#FDBA74"],
  ["#22C55E", "#86EFAC"],
  ["#8B5CF6", "#C4B5FD"],
  ["#F43F5E", "#FDA4AF"],
  ["#3B82F6", "#60A5FA"],
  ["#1A1A2E", "#334155"],
  ["#FACC15", "#FDE047"],
];
