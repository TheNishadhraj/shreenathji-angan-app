import React from "react";
import { View, Text, Image } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { spacing, typography } from "../theme/tokens";

// Place shreeji.png in the assets/ folder
const shreejiLogo = require("../../assets/shreeji.png");

type ScreenHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, action }) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.md,
        marginTop: spacing.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <Image
          source={shreejiLogo}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            marginRight: spacing.sm,
          }}
          resizeMode="cover"
        />
        <Text style={{ ...typography.h2, color: colors.text }}>{title}</Text>
      </View>
      {action ? action : null}
    </View>
  );
};
