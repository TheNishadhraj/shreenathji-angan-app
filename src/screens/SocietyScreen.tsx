import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { spacing, radius } from "../theme/tokens";

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
        {societyItems.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.md,
                    backgroundColor: colors.cardSolid,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {item.description}
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};
