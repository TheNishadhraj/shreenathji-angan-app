import React from "react";
import { View, StyleProp, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../context/ThemeContext";
import { radius, shadows, spacing } from "../theme/tokens";

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  noPadding?: boolean;
  variant?: "default" | "elevated" | "subtle";
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 40,
  noPadding = false,
  variant = "default",
}) => {
  const { colors, isDark } = useTheme();

  const cardStyle: ViewStyle = {
    borderRadius: radius.lg,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...(variant === "elevated" ? shadows.glass : shadows.soft),
  };

  const innerStyle: ViewStyle = {
    ...(!noPadding && { padding: spacing.md }),
    backgroundColor: variant === "subtle" ? colors.overlay : colors.card,
  };

  // Web: use CSS backdrop-filter for real glassmorphism
  if (Platform.OS === "web") {
    const webGlass: any = {
      backdropFilter: `blur(${intensity * 0.5}px)`,
      WebkitBackdropFilter: `blur(${intensity * 0.5}px)`,
    };
    return (
      <View style={[cardStyle, innerStyle, webGlass, style]}>
        {children}
      </View>
    );
  }

  // iOS: native BlurView
  if (Platform.OS === "ios") {
    return (
      <View style={[cardStyle, style]}>
        <BlurView
          intensity={isDark ? intensity * 0.6 : intensity}
          tint={isDark ? "dark" : "light"}
          style={innerStyle}
        >
          {children}
        </BlurView>
      </View>
    );
  }

  // Android: fallback
  return (
    <View style={[cardStyle, innerStyle, style]}>
      {children}
    </View>
  );
};
