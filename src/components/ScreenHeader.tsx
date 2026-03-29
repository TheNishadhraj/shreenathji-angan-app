import React from "react";
import { View, Text, Image, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { spacing, typography, radius } from "../theme/tokens";

// Place shreeji.png in the assets/ folder
const shreejiLogo = require("../../assets/shreeji.png");

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBack?: boolean;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, action, showBack = false }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: subtitle ? spacing.xs : spacing.md,
        marginTop: showBack ? spacing.xs : spacing.lg,
        minHeight: 48,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        {showBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.overlay,
              alignItems: "center",
              justifyContent: "center",
              marginRight: spacing.sm,
            }}
          >
            <Ionicons
              name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
              size={22}
              color={colors.text}
            />
          </Pressable>
        ) : (
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
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ ...typography.h2, color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {action ? action : null}
    </View>
  );
};
