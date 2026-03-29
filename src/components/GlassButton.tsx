import React from "react";
import { Pressable, Text, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, typography, palette } from "../theme/tokens";

type GlassButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const sizes = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13 },
    md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17 },
  };

  const s = sizes[size];
  const opacity = disabled ? 0.5 : 1;

  if (variant === "primary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : opacity,
          borderRadius: radius.xl,
          overflow: "hidden" as const,
          ...(fullWidth ? {} : { alignSelf: "flex-start" as const }),
        })}
      >
        <LinearGradient
          colors={[palette.primary, palette.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: s.paddingVertical,
            paddingHorizontal: s.paddingHorizontal,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              {icon ? <Text style={{ fontSize: s.fontSize + 2 }}>{icon}</Text> : null}
              <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: s.fontSize }}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyles: Record<string, { bg: string; textColor: string; borderColor: string }> = {
    ghost: {
      bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      textColor: colors.text,
      borderColor: colors.cardBorder,
    },
    danger: {
      bg: `${palette.danger}18`,
      textColor: palette.danger,
      borderColor: `${palette.danger}30`,
    },
    accent: {
      bg: `${colors.accent}18`,
      textColor: colors.accent,
      borderColor: `${colors.accent}30`,
    },
    outline: {
      bg: "transparent",
      textColor: colors.primary,
      borderColor: colors.primary,
    },
  };

  const vs = variantStyles[variant] || variantStyles.ghost;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        paddingVertical: s.paddingVertical,
        paddingHorizontal: s.paddingHorizontal,
        minHeight: 44,
        borderRadius: radius.xl,
        backgroundColor: vs.bg,
        borderWidth: 1,
        borderColor: vs.borderColor,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        flexDirection: "row" as const,
        gap: 8,
        opacity: pressed ? 0.8 : opacity,
        ...(fullWidth ? {} : { alignSelf: "flex-start" as const }),
      })}
    >
      {loading ? (
        <ActivityIndicator color={vs.textColor} size="small" />
      ) : (
        <>
          {icon ? <Text style={{ fontSize: s.fontSize + 2 }}>{icon}</Text> : null}
          <Text style={{ color: vs.textColor, fontFamily: "Inter_600SemiBold", fontSize: s.fontSize }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};
