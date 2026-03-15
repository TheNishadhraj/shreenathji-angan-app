import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, LayoutAnimation, UIManager, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { GlassCard } from "../components/GlassCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionHeader } from "../components/SectionHeader";
import { spacing, typography, radius, palette } from "../theme/tokens";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const RulesScreen: React.FC = () => {
  const { colors } = useTheme();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen(open === id ? null : id);
  };

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <ScreenHeader title="Rules & Regulations" />
        <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, marginTop: -spacing.sm }}>Community guidelines</Text>

        <View style={{ gap: spacing.md }}>
          {SocietyData.rules.map((rule) => {
            const isOpen = open === rule.id;
            return (
              <GlassCard key={rule.id} variant={isOpen ? "elevated" : "default"}>
                <Pressable
                  onPress={() => toggle(rule.id)}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 22, marginRight: spacing.sm }}>{rule.icon}</Text>
                    <Text style={{ ...typography.bodyBold, color: colors.text, flex: 1 }}>{rule.category}</Text>
                  </View>
                  <View style={{
                    width: 28,
                    height: 28,
                    borderRadius: radius.full,
                    backgroundColor: isOpen ? `${palette.primary}20` : colors.overlay,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ ...typography.bodyBold, color: isOpen ? palette.primary : colors.textMuted }}>
                      {isOpen ? "−" : "+"}
                    </Text>
                  </View>
                </Pressable>

                {isOpen ? (
                  <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                    {rule.rules.map((text: string, idx: number) => (
                      <View key={idx} style={{ flexDirection: "row", gap: spacing.sm }}>
                        <View style={{
                          width: 6, height: 6, borderRadius: 3,
                          backgroundColor: palette.primary,
                          marginTop: 8,
                        }} />
                        <Text style={{ ...typography.caption, color: colors.textSecondary, flex: 1 }}>{text}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </GlassCard>
            );
          })}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};
