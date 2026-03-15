import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SocietyData } from "../data/societyData";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { SectionHeader } from "../components/SectionHeader";
import { Badge } from "../components/Badge";
import { spacing } from "../theme/tokens";
import { formatDate } from "../utils/format";

export const NoticesScreen: React.FC = () => {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionHeader title="📋 Notice Board" subtitle="Important updates for residents" />
      <View style={{ gap: spacing.md }}>
        {SocietyData.notices.map((notice) => (
          <Card key={notice.id} style={{ borderLeftWidth: 4, borderLeftColor: notice.priority === "urgent" ? colors.danger : notice.priority === "important" ? colors.info : colors.primary }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{notice.title}</Text>
              <Badge label={notice.priority.toUpperCase()} tone={notice.priority === "urgent" ? "danger" : notice.priority === "important" ? "info" : "primary"} />
            </View>
            <Text style={{ color: colors.textSecondary }}>{notice.content}</Text>
            <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>{formatDate(notice.date)} • {notice.postedBy}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};
