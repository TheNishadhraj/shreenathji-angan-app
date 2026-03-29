import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "./GlassCard";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, typography, palette } from "../theme/tokens";

type StatCardProps = {
  icon: string;
  label: string;
  value: string | number;
  gradient?: readonly [string, string];
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  gradient,
}) => {
  const { colors } = useTheme();

  return (
    <GlassCard style={{ flex: 1 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          overflow: "hidden",
          marginBottom: spacing.sm,
        }}
      >
        <LinearGradient
          colors={gradient ? [gradient[0], gradient[1]] : [palette.primary, palette.primaryLight]}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </LinearGradient>
      </View>
      <Text style={{ ...typography.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text style={{ ...typography.h2, color: colors.text, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </GlassCard>
  );
};
