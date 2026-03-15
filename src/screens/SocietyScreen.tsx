import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { spacing, radius, cardGradients, shadows } from "../theme/tokens";

const societyItems = [
  { label: "Committee", icon: "👥", screen: "Committee", description: "View society committee members" },
  { label: "News & Updates", icon: "📰", screen: "News", description: "Latest society news and updates" },
  { label: "Rules & Regulations", icon: "📜", screen: "Rules", description: "Society bylaws and guidelines" },
  { label: "Polls & Votes", icon: "🗳️", screen: "Polls", description: "Participate in society decisions" },
  { label: "Member Directory", icon: "👨‍👩‍👧‍👦", screen: "Directory", description: "Find and contact residents" },
];

export const SocietyScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <ScreenHeader title="Society" />
      <View style={{ gap: spacing.sm }}>
        {societyItems.map((item, idx) => {
          const grad = cardGradients[idx % cardGradients.length];
          return (
            <Pressable
              key={item.label}
              onPress={() => navigation.navigate(item.screen as never)}
            >
              <Card style={shadows.soft}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.md,
                      overflow: "hidden",
                    }}
                  >
                    <LinearGradient
                      colors={[grad[0], grad[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                    </LinearGradient>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 13 }}>
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};
