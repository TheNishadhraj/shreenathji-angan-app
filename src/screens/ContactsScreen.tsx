import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { GlassCard } from "../components/GlassCard";
import { GlassInput } from "../components/GlassInput";
import { SectionHeader } from "../components/SectionHeader";
import { spacing, typography, radius, palette, cardGradients } from "../theme/tokens";

const emergencyNumbers = [
  { label: "Ambulance", number: "108", icon: "🚑", gradient: cardGradients[3] },
  { label: "Fire", number: "101", icon: "🚒", gradient: cardGradients[7] },
  { label: "Police", number: "100", icon: "🚓", gradient: cardGradients[0] },
];

export const ContactsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const list = SocietyData.contacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase())
  );

  const call = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <SectionHeader title="Contacts" subtitle="Emergency + service partners" size="lg" style={{ marginTop: spacing.lg }} />

        {/* Emergency hotlines */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
          {emergencyNumbers.map((item) => (
            <Pressable
              key={item.number}
              onPress={() => call(item.number)}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={[...item.gradient] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: radius.lg,
                  padding: spacing.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  height: 80,
                }}
              >
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                <Text style={{ ...typography.small, color: "#fff", marginTop: 2 }}>{item.number}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        <GlassInput
          placeholder="Search contacts..."
          icon="🔍"
          value={query}
          onChangeText={setQuery}
        />

        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {list.map((contact) => (
            <GlassCard key={contact.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: contact.color,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 20 }}>{contact.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodyBold, color: colors.text }}>{contact.category}</Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>{contact.name}</Text>
                </View>
                <Pressable
                  onPress={() => call(contact.phone)}
                  style={{
                    paddingHorizontal: spacing.sm + 2,
                    paddingVertical: spacing.xs + 2,
                    borderRadius: radius.full,
                    backgroundColor: `${palette.primary}15`,
                  }}
                >
                  <Text style={{ ...typography.small, color: palette.primary }}>{contact.phone}</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};
