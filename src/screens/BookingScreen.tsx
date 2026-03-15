import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { spacing, radius } from "../theme/tokens";
import { formatDate } from "../utils/format";

export const BookingScreen: React.FC = () => {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState(SocietyData.bookings);
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState("");

  const handleBook = (venueId: number) => {
    if (!purpose || !date) return;
    const venue = SocietyData.venues.find((v) => v.id === venueId);
    if (!venue) return;
    setBookings([
      {
        id: Date.now(),
        venue: venue.name,
        date,
        purpose,
        bookedBy: "You",
        status: "Pending"
      },
      ...bookings
    ]);
    setPurpose("");
    setDate("");
    setSelectedVenue(null);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <SectionHeader title="🏛️ Book Venue" subtitle="Reserve community spaces" />
      <View style={{ gap: spacing.md }}>
        {SocietyData.venues.map((venue) => (
          <Card key={venue.id}>
            <LinearGradient colors={[...venue.gradient] as [string, string]} style={{ borderRadius: radius.md, padding: spacing.md }}>
              <Text style={{ fontSize: 26 }}>{venue.icon}</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>{venue.name}</Text>
              <Text style={{ color: "#ecfeff" }}>{venue.description}</Text>
            </LinearGradient>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>Capacity: {venue.capacity}</Text>
            <Text style={{ color: colors.textSecondary }}>₹{venue.price}/day • Deposit ₹{venue.deposit}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
              {venue.amenities.map((amenity) => (
                <View key={amenity} style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: `${colors.primary}22`, borderRadius: radius.full }}>
                  <Text style={{ fontSize: 12, color: colors.primary }}>{amenity}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => setSelectedVenue(venue.id)} style={{ marginTop: spacing.sm, backgroundColor: colors.primary, padding: 10, borderRadius: radius.md, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Book Now</Text>
            </Pressable>
            {selectedVenue === venue.id ? (
              <View style={{ marginTop: spacing.sm }}>
                <TextInput
                  placeholder="Purpose"
                  placeholderTextColor={colors.textMuted}
                  value={purpose}
                  onChangeText={setPurpose}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, marginBottom: spacing.sm, color: colors.text }}
                />
                <TextInput
                  placeholder="Date (YYYY-MM-DD)"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={setDate}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, marginBottom: spacing.sm, color: colors.text }}
                />
                <Pressable onPress={() => handleBook(venue.id)} style={{ backgroundColor: colors.secondary, padding: 10, borderRadius: radius.md, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm Booking</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      <SectionHeader title="My Bookings" />
      <View style={{ gap: spacing.md }}>
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <Text style={{ fontWeight: "700", color: colors.text }}>{booking.venue}</Text>
            <Text style={{ color: colors.textSecondary }}>{booking.purpose}</Text>
            <Text style={{ color: colors.textMuted }}>{formatDate(booking.date)} • {booking.status}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};
