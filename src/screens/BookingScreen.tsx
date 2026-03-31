import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Chip } from "../components/Chip";
import { spacing, radius, palette } from "../theme/tokens";
import { formatDate } from "../utils/format";
import {
  getBookings,
  addBooking,
  updateBookingStatus,
  cancelBooking,
  addNotification,
  getSession,
  updateBookingPayment,
  type BookingRecord,
} from "../utils/storage";
import { sanitizeText, MAX_LENGTHS } from "../utils/security";

// ── Calendar ────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WDAYS = ["S","M","T","W","T","F","S"];

type CalendarModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  colors: any;
  initialDate?: string;
};

const CalendarModal: React.FC<CalendarModalProps> = ({ visible, onClose, onSelect, colors, initialDate }) => {
  const now = new Date();
  const [viewMonth, setViewMonth] = React.useState(now.getMonth());
  const [viewYear, setViewYear] = React.useState(now.getFullYear());
  const [selected, setSelected] = React.useState(initialDate ?? "");

  React.useEffect(() => { if (visible) setSelected(initialDate ?? ""); }, [visible, initialDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: spacing.lg,
            paddingBottom: 36,
          }}
        >
          {/* Month nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
            <Pressable onPress={prevMonth} hitSlop={10} style={{ padding: 6 }}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={{ fontWeight: "700", color: colors.text, fontSize: 17 }}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={10} style={{ padding: 6 }}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>
          {/* Day-of-week headers */}
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {WDAYS.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>{d}</Text>
              </View>
            ))}
          </View>
          {/* Day cells */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={{ width: "14.28%" }} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const thisDate = new Date(viewYear, viewMonth, day);
              const isPast = thisDate < today;
              const isSel = selected === dateStr;
              const isTd = thisDate.getTime() === today.getTime();
              return (
                <Pressable
                  key={dateStr}
                  disabled={isPast}
                  onPress={() => setSelected(dateStr)}
                  style={{ width: "14.28%", alignItems: "center", paddingVertical: 3 }}
                >
                  <View
                    style={{
                      width: 38, height: 38, borderRadius: 19,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: isSel ? palette.primary : isTd ? `${palette.primary}22` : "transparent",
                      borderWidth: isTd && !isSel ? 1 : 0,
                      borderColor: palette.primary,
                    }}
                  >
                    <Text style={{ color: isPast ? colors.textMuted : isSel ? "#FFF" : colors.text, fontSize: 15, fontWeight: isSel || isTd ? "700" : "400" }}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {/* Confirm */}
          <Pressable
            onPress={() => {
              if (!selected) { Alert.alert("No date selected", "Please tap a future date."); return; }
              onSelect(selected);
              onClose();
            }}
            style={{
              backgroundColor: selected ? palette.primary : colors.border,
              padding: 14, borderRadius: radius.md, alignItems: "center", marginTop: spacing.md,
            }}
          >
            <Text style={{ color: selected ? "#FFF" : colors.textMuted, fontWeight: "700", fontSize: 15 }}>
              {selected ? `Confirm  ${selected}` : "Select a Date"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const statusTone = (s: string): "success" | "warning" | "danger" | "info" | "accent" => {
  if (s === "Approved") return "success";
  if (s === "Pending") return "warning";
  if (s === "Cancelled") return "danger";
  return "info";
};

export const BookingScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [filter, setFilter] = useState<"Mine" | "All">("Mine");

  // Calendar
  const [showCalendar, setShowCalendar] = useState(false);

  // Admin detail modal
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState<BookingRecord | null>(null);

  const isAdmin = ["Admin", "President", "Secretary"].includes(currentUser?.role ?? "");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await getSession();
        if (session) setCurrentUser({ name: session.name, email: session.email, role: session.role });
        const stored = await getBookings();
        if (stored.length === 0) {
          const seeded: BookingRecord[] = SocietyData.bookings.map((b: any) => ({
            id: b.id ?? Date.now() + Math.random(),
            venue: b.venue,
            date: b.date,
            purpose: b.purpose,
            bookedBy: b.bookedBy,
            bookedByEmail: b.bookedByEmail ?? "",
            status: b.status ?? "Pending",
          }));
          setBookings(seeded);
        } else {
          setBookings(stored);
        }
      };
      load();
    }, [])
  );

  const validateDate = (val: string): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return "Please enter date in YYYY-MM-DD format.";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(val);
    if (isNaN(picked.getTime())) return "Invalid date.";
    if (picked < today) return "Booking date cannot be in the past.";
    return null;
  };

  const checkConflict = (venueId: number, dateVal: string): boolean => {
    const venueName = SocietyData.venues.find((v) => v.id === venueId)?.name ?? "";
    return bookings.some(
      (b) =>
        b.venue === venueName &&
        b.date === dateVal &&
        (b.status === "Pending" || b.status === "Approved")
    );
  };

  const handleBook = async (venueId: number) => {
    const safePurpose = sanitizeText(purpose, MAX_LENGTHS.bookingPurpose);
    if (!safePurpose) {
      Alert.alert("Required", "Please enter a purpose.");
      return;
    }
    const dateErr = validateDate(date);
    if (dateErr) {
      Alert.alert("Invalid Date", dateErr);
      return;
    }
    if (checkConflict(venueId, date)) {
      Alert.alert(
        "Venue Unavailable",
        "This venue is already booked or pending for the selected date. Please choose a different date."
      );
      return;
    }
    const venue = SocietyData.venues.find((v) => v.id === venueId);
    if (!venue) return;
    const entry = await addBooking({
      venue: venue.name,
      date,
      purpose: safePurpose,
      bookedBy: currentUser?.name ?? "Resident",
      bookedByEmail: currentUser?.email ?? "",
      status: "Pending",
    });
    setBookings((prev) => [entry, ...prev]);
    setPurpose("");
    setDate("");
    setSelectedVenue(null);

    await addNotification({
      title: "Booking Submitted",
      message: `${venue.name} booking for ${date} submitted. Awaiting approval.`,
      icon: "🏛️",
      date: new Date().toISOString().split("T")[0],
      targetType: "all",
    });

    Alert.alert("Submitted", `${venue.name} booking for ${date} is pending committee approval.`);
  };

  const handleCancel = async (booking: BookingRecord) => {
    if (booking.status === "Approved") {
      Alert.alert("Notice", "Approved bookings cannot be cancelled directly. Please contact the committee.");
      return;
    }
    Alert.alert("Cancel Booking", `Cancel your booking for "${booking.venue}" on ${booking.date}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive", onPress: async () => {
          await cancelBooking(booking.id);
          setBookings((prev) =>
            prev.map((b) => b.id === booking.id ? { ...b, status: "Cancelled" } : b)
          );
          await addNotification({
            title: "Booking Cancelled",
            message: `Your booking for ${booking.venue} on ${booking.date} was cancelled.`,
            icon: "❌",
            date: new Date().toISOString().split("T")[0],
            targetType: "all",
          });
        },
      },
    ]);
  };

  const handleAdminUpdate = async (booking: BookingRecord, newStatus: "Approved" | "Rejected") => {
    await updateBookingStatus(booking.id, newStatus);
    setBookings((prev) =>
      prev.map((b) => b.id === booking.id ? { ...b, status: newStatus } : b)
    );
    setReviewModal(false);

    await addNotification({
      title: `Booking ${newStatus}`,
      message: `${booking.venue} booking by ${booking.bookedBy} on ${booking.date} has been ${newStatus.toLowerCase()}.`,
      icon: newStatus === "Approved" ? "✅" : "❌",
      date: new Date().toISOString().split("T")[0],
      targetType: "all",
      targetUser: booking.bookedByEmail,
    });

    Alert.alert(newStatus, `Booking for ${booking.venue} on ${booking.date} is now ${newStatus}.`);
  };

  const handlePayDeposit = async (booking: BookingRecord) => {
    const venue = SocietyData.venues.find((v) => v.name === booking.venue);
    const depositAmt = venue?.deposit ?? 0;
    Alert.alert(
      "Pay Deposit",
      `Pay ₹${depositAmt} deposit for ${booking.venue} on ${booking.date}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Payment",
          onPress: async () => {
            await updateBookingPayment(booking.id, "Paid");
            setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, paymentStatus: "Paid" } : b));
            await addNotification({
              title: "Deposit Paid",
              message: `₹${depositAmt} deposit for ${booking.venue} on ${booking.date} confirmed.`,
              icon: "💳",
              date: new Date().toISOString().split("T")[0],
              targetType: "all",
              targetUser: booking.bookedByEmail,
            });
            Alert.alert("Payment Confirmed", `₹${depositAmt} deposit marked as paid for ${booking.venue}.`);
          },
        },
      ]
    );
  };

  const myEmail = currentUser?.email?.toLowerCase() ?? "";
  const myBookings = bookings.filter((b) => b.bookedByEmail?.toLowerCase() === myEmail);
  const displayedBookings = isAdmin && filter === "All" ? bookings : myBookings;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}
    >
      <ScreenHeader title="Book Venue" showBack />
      <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, marginTop: -spacing.sm }}>
        Reserve community spaces — available pending committee approval
      </Text>

      {/* Venue Cards */}
      <View style={{ gap: spacing.md }}>
        {SocietyData.venues.map((venue) => (
          <Card key={venue.id}>
            <LinearGradient
              colors={[...venue.gradient] as [string, string]}
              style={{ borderRadius: radius.md, padding: spacing.md }}
            >
              <Text style={{ fontSize: 26 }}>{venue.icon}</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>{venue.name}</Text>
              <Text style={{ color: "#ecfeff" }}>{venue.description}</Text>
            </LinearGradient>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
              Capacity: {venue.capacity} • ₹{venue.price}/day • Deposit ₹{venue.deposit}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
              {venue.amenities.map((amenity) => (
                <View
                  key={amenity}
                  style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: `${colors.primary}22`, borderRadius: radius.full }}
                >
                  <Text style={{ fontSize: 12, color: colors.primary }}>{amenity}</Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => setSelectedVenue(selectedVenue === venue.id ? null : venue.id)}
              style={{ marginTop: spacing.sm, backgroundColor: colors.primary, padding: 10, borderRadius: radius.md, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {selectedVenue === venue.id ? "Close Form" : "Book Now"}
              </Text>
            </Pressable>
            {selectedVenue === venue.id ? (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <TextInput
                  placeholder="Purpose (e.g. Birthday Party)"
                  placeholderTextColor={colors.textMuted}
                  value={purpose}
                  onChangeText={setPurpose}
                  maxLength={MAX_LENGTHS.bookingPurpose}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: 10,
                    color: colors.text,
                  }}
                />
                {/* Calendar date picker */}
                <Pressable
                  onPress={() => setShowCalendar(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: date ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    padding: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={date ? colors.primary : colors.textMuted} />
                  <Text style={{ color: date ? colors.text : colors.textMuted, flex: 1 }}>
                    {date || "Select date…"}
                  </Text>
                  {date ? (
                    <Pressable onPress={() => setDate("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </Pressable>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  ℹ️ Booking is subject to committee approval. Deposit: ₹{venue.deposit}
                </Text>
                <Pressable
                  onPress={() => handleBook(venue.id)}
                  style={{
                    backgroundColor: colors.primary,
                    padding: 12,
                    borderRadius: radius.md,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm Booking Request</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
      </View>

      {/* My / All Bookings */}
      <SectionHeader
        title={isAdmin ? "Bookings" : "My Bookings"}
        subtitle={isAdmin ? "Admin: review and approve" : `${myBookings.length} booking${myBookings.length !== 1 ? "s" : ""}`}
        action={
          isAdmin ? (
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              <Chip label="Mine" active={filter === "Mine"} onPress={() => setFilter("Mine")} />
              <Chip label="All" active={filter === "All"} onPress={() => setFilter("All")} />
            </View>
          ) : undefined
        }
      />

      {displayedBookings.length === 0 ? (
        <Card>
          <Text style={{ color: colors.textMuted, textAlign: "center" }}>
            {isAdmin && filter === "All" ? "No bookings found." : "You have no bookings yet."}
          </Text>
        </Card>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {displayedBookings.map((booking) => {
          const isOwn = booking.bookedByEmail?.toLowerCase() === myEmail;
          const canCancel = isOwn && (booking.status === "Pending");
          return (
            <Card key={booking.id}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>
                    🏛️ {booking.venue}
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{booking.purpose}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {formatDate(booking.date)} • By: {booking.bookedBy}
                  </Text>
                </View>
                <Badge label={booking.status} tone={statusTone(booking.status)} />
              </View>

              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                {canCancel ? (
                  <Pressable
                    onPress={() => handleCancel(booking)}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: palette.danger,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: palette.danger, fontWeight: "600", fontSize: 13 }}>Cancel</Text>
                  </Pressable>
                ) : null}
                {/* Pay Deposit button for approved + unpaid own bookings */}
                {isOwn && booking.status === "Approved" && booking.paymentStatus !== "Paid" ? (
                  <Pressable
                    onPress={() => handlePayDeposit(booking)}
                    style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: palette.success, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                  >
                    <Ionicons name="card-outline" size={15} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Pay Deposit</Text>
                  </Pressable>
                ) : null}
                {isOwn && booking.status === "Approved" && booking.paymentStatus === "Paid" ? (
                  <View style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: `${palette.success}22`, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={15} color={palette.success} />
                    <Text style={{ color: palette.success, fontWeight: "700", fontSize: 13 }}>Deposit Paid</Text>
                  </View>
                ) : null}
                {isAdmin && booking.status === "Pending" ? (
                  <>
                    <Pressable
                      onPress={() => handleAdminUpdate(booking, "Approved")}
                      style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: palette.success, alignItems: "center" }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>✓ Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleAdminUpdate(booking, "Rejected")}
                      style={{ flex: 1, padding: 10, borderRadius: radius.md, backgroundColor: palette.danger, alignItems: "center" }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>✕ Reject</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </Card>
          );
        })}
      </View>

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={(d) => setDate(d)}
        colors={colors}
        initialDate={date}
      />
    </ScrollView>
  );
};
