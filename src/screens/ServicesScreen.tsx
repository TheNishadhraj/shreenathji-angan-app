import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { spacing, radius, palette, cardGradients, shadows } from "../theme/tokens";
import { getComplaints, getBookings, getPaymentHistory, getSession } from "../utils/storage";

type ServicesScreenProps = {
  role: string;
};

export const ServicesScreen: React.FC<ServicesScreenProps> = ({ role }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const isAdmin = ["Admin", "President", "Secretary"].includes(role);

  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [openComplaintsCount, setOpenComplaintsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await getSession();
        const userEmail = session?.email?.toLowerCase() || "";

        // Pending payments for this user
        const hist = await getPaymentHistory();
        const pendingPay = hist.filter(
          (h) => h.status === "Pending" && (!h.userEmail || h.userEmail.toLowerCase() === userEmail)
        ).length;
        setPendingPaymentsCount(pendingPay);

        // Open complaints (all users see count of open complaints)
        const complaints = await getComplaints();
        const allComplaints = complaints ?? SocietyData.complaints;
        setOpenComplaintsCount(allComplaints.filter((c: any) => c.status !== "Resolved").length);

        // Pending bookings (admin sees all, user sees their own)
        const bookings = await getBookings();
        if (isAdmin) {
          setPendingBookingsCount(bookings.filter((b) => b.status === "Pending").length);
        } else {
          setPendingBookingsCount(
            bookings.filter(
              (b) => b.status === "Pending" && b.bookedByEmail?.toLowerCase() === userEmail
            ).length
          );
        }
      };
      load();
    }, [isAdmin])
  );

  const services = [
    {
      label: "Payments",
      icon: "💳",
      screen: "Payments",
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null,
      badgeColor: palette.danger,
    },
    {
      label: "Book Venue",
      icon: "🏛️",
      screen: "Booking",
      badge: isAdmin && pendingBookingsCount > 0 ? pendingBookingsCount : (!isAdmin && pendingBookingsCount > 0 ? pendingBookingsCount : null),
      badgeColor: palette.warning,
    },
    {
      label: "Complaints",
      icon: "📝",
      screen: "Complaints",
      badge: openComplaintsCount > 0 ? openComplaintsCount : null,
      badgeColor: palette.info,
    },
    {
      label: "Essential Contacts",
      icon: "📞",
      screen: "Contacts",
      badge: null,
      badgeColor: palette.success,
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
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
              <View style={{ position: "relative" }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.sm }}>
                  <LinearGradient colors={[grad[0], grad[1]]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 22 }}>{service.icon}</Text>
                  </LinearGradient>
                </View>
                {service.badge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: service.badgeColor,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                      borderWidth: 2,
                      borderColor: colors.background,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {service.badge > 99 ? "99+" : service.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontWeight: "700", color: colors.text, marginTop: 2, fontSize: 15 }}>{service.label}</Text>
              {service.badge ? (
                <Text style={{ color: service.badgeColor, fontSize: 11, fontWeight: "600", marginTop: 2 }}>
                  {service.badge} action{service.badge !== 1 ? "s" : ""} needed
                </Text>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Tap to open</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {isAdmin ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>🛡️ Admin Tools</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>Manage users, notices, finance, and approvals.</Text>
          {pendingBookingsCount > 0 ? (
            <Text style={{ color: palette.warning, fontSize: 12, fontWeight: "600", marginBottom: spacing.sm }}>
              ⏳ {pendingBookingsCount} booking{pendingBookingsCount !== 1 ? "s" : ""} awaiting approval
            </Text>
          ) : null}
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
