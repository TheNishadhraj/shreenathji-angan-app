import React from "react";
import { ScrollView, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { spacing } from "../theme/tokens";
import { formatDate } from "../utils/format";

export const NewsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}>
      <ScreenHeader title="News & Updates" />
      <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, marginTop: -spacing.sm }}>Latest society highlights</Text>
      <View style={{ gap: spacing.md }}>
        {SocietyData.news.map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
              <Badge label={item.category} tone="info" />
              <Text style={{ color: colors.textMuted }}>{formatDate(item.date)}</Text>
            </View>
            <Text style={{ fontWeight: "700", color: colors.text }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary }}>{item.description}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};
