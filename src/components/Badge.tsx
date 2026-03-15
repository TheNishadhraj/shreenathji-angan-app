import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, palette, typography } from "../theme/tokens";

type BadgeProps = {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "accent";
};

export const Badge: React.FC<BadgeProps> = ({ label, tone = "primary" }) => {
  const { colors } = useTheme();
  const toneColors: Record<string, { bg: string; text: string }> = {
    primary: { bg: `${palette.primary}1A`, text: palette.primary },
    success: { bg: `${palette.success}1A`, text: palette.success },
    warning: { bg: `${palette.warning}1A`, text: palette.warning },
    danger: { bg: `${palette.danger}1A`, text: palette.danger },
    info: { bg: `${palette.info}1A`, text: palette.info },
    accent: { bg: `${colors.accent}1A`, text: colors.accent },
  };
  const selected = toneColors[tone] || toneColors.primary;
  return (
    <View
      style={{
        backgroundColor: selected.bg,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: `${selected.text}20`,
      }}
    >
      <Text style={{ color: selected.text, ...typography.small }}>{label}</Text>
    </View>
  );
};
