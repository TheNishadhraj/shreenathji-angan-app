import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { radius, shadows, spacing } from "../theme/tokens";

type CardProps = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  noPadding?: boolean;
};

export const Card: React.FC<CardProps> = ({ style, children, noPadding }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          ...(!noPadding && { padding: spacing.md }),
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...shadows.soft,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
