import React from "react";
import { ScrollView, View, Text } from "react-native";
import { useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { GlassCard } from "../components/GlassCard";
import { SocietyData } from "../data/societyData";
import { palette, radius, spacing, typography } from "../theme/tokens";

const BHK_CONFIG: Record<string, { icon: string; gradient: readonly [string, string] }> = {
  "5-BHK": { icon: "🏡", gradient: [palette.purple, "#A78BFA"] },
  "4-BHK": { icon: "🏠", gradient: [palette.primary, palette.primaryLight] },
  "3-BHK": { icon: "🏘️", gradient: [palette.accent, palette.accentLight] },
};

export const HouseDetailsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const mode: "houses" | "residents" = route.params?.mode ?? "houses";

  const { houseTypes, totalHouses, totalResidents } = SocietyData.society;
  const isHouses = mode === "houses";
  const title = isHouses ? "Total Houses" : "Total Residents";
  const total = isHouses ? totalHouses : totalResidents;
  const icon = isHouses ? "🏢" : "👨‍👩‍👧‍👦";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl }}
    >
      {/* Hero Card */}
      <GlassCard variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.xl,
              overflow: "hidden",
              marginBottom: spacing.md,
            }}
          >
            <LinearGradient
              colors={[palette.primary, palette.primaryLight]}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 32 }}>{icon}</Text>
            </LinearGradient>
          </View>
          <Text style={{ ...typography.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 48, fontWeight: "800", color: colors.text, marginTop: 4 }}>
            {total}
          </Text>
          <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: 4 }}>
            Across {houseTypes.length} house types
          </Text>
        </View>
      </GlassCard>

      {/* BHK Tiles */}
      <Text style={{ ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm }}>
        Breakdown by Type
      </Text>
      <View style={{ gap: spacing.md }}>
        {houseTypes.map((ht) => {
          const config = BHK_CONFIG[ht.type] ?? { icon: "🏠", gradient: [palette.info, "#60A5FA"] };
          const value = isHouses ? ht.houses : ht.residents;
          const subtitle = isHouses
            ? `${ht.residents} residents living here`
            : `Across ${ht.houses} houses`;

          return (
            <GlassCard key={ht.type} variant="elevated">
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: radius.lg,
                    overflow: "hidden",
                    marginRight: spacing.md,
                  }}
                >
                  <LinearGradient
                    colors={[config.gradient[0], config.gradient[1]]}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 24 }}>{config.icon}</Text>
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {ht.type}
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>
                    {value}
                  </Text>
                  <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: 2 }}>
                    {subtitle}
                  </Text>
                </View>
              </View>
            </GlassCard>
          );
        })}
      </View>
    </ScrollView>
  );
};
