import React from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { spacing, typography } from "../theme/tokens";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
  size = "md",
}) => {
  const { colors } = useTheme();
  const titleStyle = size === "lg" ? typography.h1 : size === "sm" ? typography.bodyBold : typography.h3;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.md,
          marginTop: spacing.lg,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...titleStyle, color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
        {subtitle ? (
          <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
};
