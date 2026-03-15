import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { avatarGradients, radius, typography } from "../theme/tokens";

type AvatarCircleProps = {
  name: string;
  size?: number;
  index?: number;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const AvatarCircle: React.FC<AvatarCircleProps> = ({
  name,
  size = 52,
  index,
}) => {
  const gradientIndex = index ?? (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % avatarGradients.length;
  const gradient = avatarGradients[gradientIndex];
  const fontSize = size * 0.36;

  return (
    <LinearGradient
      colors={[gradient[0], gradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#FFF",
          fontSize,
          fontFamily: "Poppins_700Bold",
          letterSpacing: 1,
        }}
      >
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
};
