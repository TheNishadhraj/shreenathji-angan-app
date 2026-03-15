import React from "react";
import { View, StyleProp, ViewStyle, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

type ScreenWrapperProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  gradient?: boolean;
};

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  padded = false,
  gradient = true,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  // On web, limit width for a mobile-like layout in the browser
  const webContainer: ViewStyle | undefined = isWeb
    ? { maxWidth: 480, width: "100%" as any, alignSelf: "center" as const }
    : undefined;

  if (gradient) {
    return (
      <LinearGradient
        colors={colors.heroGradient as unknown as [string, string]}
        style={[
          {
            flex: 1,
            paddingTop: isWeb ? 0 : insets.top,
          },
          padded && { paddingHorizontal: 20 },
          style,
        ]}
      >
        <View style={[{ flex: 1 }, webContainer]}>
          {children}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: isWeb ? 0 : insets.top,
        },
        padded && { paddingHorizontal: 20 },
        style,
      ]}
    >
      <View style={[{ flex: 1 }, webContainer]}>
        {children}
      </View>
    </View>
  );
};
