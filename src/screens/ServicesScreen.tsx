import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { spacing, radius, palette, cardGradients, shadows } from "../theme/tokens";

type ServicesScreenProps = {
  role: string;
};

const services = [
  { label: "Payments", icon: "💳", screen: "Payments" },
  { label: "Book Venue", icon: "🏛️", screen: "Booking" },
  { label: "Complaints", icon: "📝", screen: "Complaints" },
  { label: "Essential Contacts", icon: "📞", screen: "Contacts" },
];

export const ServicesScreen: React.FC<ServicesScreenProps> = ({ role }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const isAdmin = ["Admin", "President", "Secretary"].includes(role);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <ScreenHeader title="Services" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {services.map((service, idx) => {
          const grad = cardGradients[idx % cardGradients.length];
          return (
            <Pressable
              key={service.label}
              onPress={() => navigation.navigate(service.screen as never)}
              style={{
                flexBasis: "48%",
                backgroundColor: colors.card,
                padding: spacing.md,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                ...shadows.soft,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.sm }}>
                <LinearGradient colors={[grad[0], grad[1]]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 22 }}>{service.icon}</Text>
                </LinearGradient>
              </View>
              <Text style={{ fontWeight: "700", color: colors.text, marginTop: 2, fontSize: 15 }}>{service.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isAdmin ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>🛡️ Admin Tools</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>Manage users, notices, finance, and approvals.</Text>
          <Pressable onPress={() => navigation.navigate("Admin" as never)} style={{ borderRadius: radius.md, overflow: "hidden" }}>
            <LinearGradient colors={[palette.purple, "#A78BFA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 12, borderRadius: radius.md, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Open Admin Hub</Text>
            </LinearGradient>
          </Pressable>
        </Card>
      ) : null}
    </ScrollView>
  );
};
