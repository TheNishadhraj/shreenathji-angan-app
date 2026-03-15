import React from "react";
import { TextInput, View, Text, TextInputProps, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, typography } from "../theme/tokens";

type GlassInputProps = TextInputProps & {
  label?: string;
  icon?: string;
  containerStyle?: ViewStyle;
};

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  icon,
  containerStyle,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <View style={[{ marginBottom: spacing.sm }, containerStyle]}>
      {label ? (
        <Text
          style={{
            ...typography.small,
            color: colors.textMuted,
            marginBottom: 6,
            marginLeft: 4,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        {icon ? <Text style={{ fontSize: 18 }}>{icon}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            {
              flex: 1,
              paddingVertical: 14,
              color: colors.text,
              ...typography.body,
            },
            style,
          ]}
          {...props}
        />
      </View>
    </View>
  );
};
