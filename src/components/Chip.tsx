import React from "react";
import { Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, typography, palette } from "../theme/tokens";

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
};

export const Chip: React.FC<ChipProps> = ({ label, active, onPress, icon }) => {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  if (active) {
    return (
      <Pressable onPress={handlePress} style={{ borderRadius: radius.full, overflow: "hidden" }}>
        <LinearGradient
          colors={[palette.primary, palette.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          {icon ? <Text style={{ fontSize: 14 }}>{icon}</Text> : null}
          <Text style={{ color: "#FFF", ...typography.captionBold }}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.card,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon ? <Text style={{ fontSize: 14 }}>{icon}</Text> : null}
      <Text style={{ color: colors.textSecondary, ...typography.captionBold }}>{label}</Text>
    </Pressable>
  );
};
