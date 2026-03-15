import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { spacing, radius } from "../theme/tokens";

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
        {services.map((service) => (
          <Pressable
            key={service.label}
            onPress={() => navigation.navigate(service.screen as never)}
            style={{
              flexBasis: "48%",
              backgroundColor: colors.card,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <Text style={{ fontSize: 24 }}>{service.icon}</Text>
            <Text style={{ fontWeight: "700", color: colors.text, marginTop: 6 }}>{service.label}</Text>
          </Pressable>
        ))}
      </View>

      {isAdmin ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ fontWeight: "700", color: colors.text }}>🛡️ Admin Tools</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>Manage users, notices, finance, and approvals.</Text>
          <Pressable onPress={() => navigation.navigate("Admin" as never)} style={{ backgroundColor: colors.secondary, padding: 12, borderRadius: radius.md, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Open Admin Hub</Text>
          </Pressable>
        </Card>
      ) : null}
    </ScrollView>
  );
};
