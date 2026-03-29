import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { GlassCard } from "../components/GlassCard";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Chip } from "../components/Chip";
import { spacing, typography, radius, palette, cardGradients } from "../theme/tokens";
import { currency } from "../utils/format";
import {
  getComplaints, updateComplaintStatus, getPaymentTypes, setPaymentTypes,
  addNotification,
  getBookings, updateBookingStatus,
  getPolls, addPoll, closePoll,
  type PaymentType, type ComplaintRecord, type BookingRecord,
} from "../utils/storage";

export const AdminScreen: React.FC = () => {
  const { colors } = useTheme();
  const [complaints, setLocalComplaints] = useState<ComplaintRecord[]>([]);
  const [payTypes, setLocalPayTypes] = useState<PaymentType[]>([]);
  const [bookings, setLocalBookings] = useState<BookingRecord[]>([]);
  const [polls, setLocalPolls] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "complaints" | "notify" | "bookings" | "polls">("overview");

  // Notify state
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");

  // Payment type edit modal
  const [payModal, setPayModal] = useState(false);
  const [editPay, setEditPay] = useState<PaymentType | null>(null);
  const [payName, setPayName] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [payDesc, setPayDesc] = useState("");

  // Booking filter
  const [bookingFilter, setBookingFilter] = useState<"All" | "Pending" | "Approved" | "Cancelled">("Pending");

  // Create poll modal
  const [pollModal, setPollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollDesc, setPollDesc] = useState("");
  const [pollDeadline, setPollDeadline] = useState("");
  const [pollType, setPollType] = useState<"public" | "committee">("public");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [savingPoll, setSavingPoll] = useState(false);

  const loadData = async () => {
    const storedComplaints = await getComplaints();
    setLocalComplaints(storedComplaints ?? SocietyData.complaints.map((c) => ({ ...c, raisedByEmail: "" })));

    const storedTypes = await getPaymentTypes();
    setLocalPayTypes(storedTypes ?? SocietyData.paymentTypes.map((t) => ({
      id: t.id, name: t.name, amount: t.amount, period: t.period, description: t.description,
    })));

    const storedBookings = await getBookings();
    setLocalBookings(storedBookings);

    const storedPolls = await getPolls();
    setLocalPolls(storedPolls ?? SocietyData.polls ?? []);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const pendingComplaints = complaints.filter((c) => c.status === "Pending").length;
  const inProgress = complaints.filter((c) => c.status === "In Progress").length;
  const pendingBookings = bookings.filter((b) => b.status === "Pending").length;
  const totalUsers = SocietyData.users.length;

  const stats = [
    { icon: "📝", label: "Pending Complaints", value: pendingComplaints, gradient: cardGradients[3] },
    { icon: "🛠️", label: "In Progress", value: inProgress, gradient: cardGradients[4] },
    { icon: "📅", label: "Pending Bookings", value: pendingBookings, gradient: cardGradients[1] },
    { icon: "👤", label: "Total Users", value: totalUsers, gradient: cardGradients[0] },
  ];

  // ─── Complaint Management ──────────────────────────────────────
  const handleComplaintUpdate = async (complaint: ComplaintRecord, newStatus: string) => {
    await updateComplaintStatus(complaint.id, newStatus);
    setLocalComplaints((prev) =>
      prev.map((c) => c.id === complaint.id ? { ...c, status: newStatus } : c)
    );
    await addNotification({
      title: "Complaint Updated",
      message: `"${complaint.title}" changed to ${newStatus}`,
      icon: newStatus === "Resolved" ? "✅" : "🛠️",
      date: new Date().toISOString().split("T")[0],
      targetType: "complaints",
    });
  };

  // ─── Payment Type Management ───────────────────────────────────
  const openPayModal = (type?: PaymentType) => {
    if (type) {
      setEditPay(type);
      setPayName(type.name);
      setPayAmount(String(type.amount));
      setPayPeriod(type.period);
      setPayDesc(type.description);
    } else {
      setEditPay(null);
      setPayName("");
      setPayAmount("");
      setPayPeriod("per month");
      setPayDesc("");
    }
    setPayModal(true);
  };

  const savePayType = async () => {
    if (!payName.trim()) return;
    const amount = Number(payAmount) || 0;
    let updated: PaymentType[];
    if (editPay) {
      updated = payTypes.map((t) =>
        t.id === editPay.id ? { ...t, name: payName.trim(), amount, period: payPeriod.trim(), description: payDesc.trim() } : t
      );
    } else {
      updated = [...payTypes, { id: Date.now(), name: payName.trim(), amount, period: payPeriod.trim(), description: payDesc.trim() }];
    }
    await setPaymentTypes(updated);
    setLocalPayTypes(updated);
    setPayModal(false);

    await addNotification({
      title: "Payment Type Changed",
      message: `${editPay ? "Updated" : "Added"}: ${payName.trim()} — ${currency(amount)}`,
      icon: "💳",
      date: new Date().toISOString().split("T")[0],
      targetType: "all",
    });
  };

  const deletePayType = async (id: number) => {
    const type = payTypes.find((t) => t.id === id);
    Alert.alert("Delete", `Remove "${type?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const updated = payTypes.filter((t) => t.id !== id);
          await setPaymentTypes(updated);
          setLocalPayTypes(updated);
          await addNotification({
            title: "Payment Type Removed",
            message: `"${type?.name}" removed`,
            icon: "🗑️",
            date: new Date().toISOString().split("T")[0],
            targetType: "all",
          });
        },
      },
    ]);
  };

  // ─── Send Notification ─────────────────────────────────────────
  const sendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      Alert.alert("Required", "Please fill title and message.");
      return;
    }
    await addNotification({
      title: notifyTitle.trim(),
      message: notifyMessage.trim(),
      icon: "📢",
      date: new Date().toISOString().split("T")[0],
      targetType: "all",
    });
    Alert.alert("Sent", "Notification sent to all users.");
    setNotifyTitle("");
    setNotifyMessage("");
  };

  // ─── Booking Actions ───────────────────────────────────────────
  const handleBookingAction = async (booking: BookingRecord, newStatus: "Approved" | "Rejected") => {
    await updateBookingStatus(booking.id, newStatus);
    setLocalBookings((prev) =>
      prev.map((b) => b.id === booking.id ? { ...b, status: newStatus } : b)
    );
    const icon = newStatus === "Approved" ? "✅" : "❌";
    await addNotification({
      title: `Booking ${newStatus}`,
      message: `${booking.venue} on ${booking.date} — ${newStatus.toLowerCase()} by admin`,
      icon,
      date: new Date().toISOString().split("T")[0],
      targetType: "bookings",
    });
  };

  // ─── Poll Actions ──────────────────────────────────────────────
  const handleClosePoll = (poll: any) => {
    Alert.alert("Close Poll", `Close "${poll.question}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close", style: "destructive", onPress: async () => {
          await closePoll(poll.id);
          setLocalPolls((prev) =>
            prev.map((p) => p.id === poll.id ? { ...p, status: "Closed" } : p)
          );
        },
      },
    ]);
  };

  const openPollModal = () => {
    setPollTitle("");
    setPollDesc("");
    setPollDeadline("");
    setPollType("public");
    setPollOptions(["", ""]);
    setPollModal(true);
  };

  const savePoll = async () => {
    if (!pollTitle.trim()) { Alert.alert("Required", "Poll question is required."); return; }
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) { Alert.alert("Required", "At least 2 options required."); return; }
    setSavingPoll(true);
    try {
      const pollData = {
        question: pollTitle.trim(),
        description: pollDesc.trim(),
        deadline: pollDeadline.trim() || null,
        type: pollType,
        status: "Active",
        options: validOptions.map((o, i) => ({ id: i + 1, text: o.trim(), votes: [] })),
        createdAt: new Date().toISOString(),
      };
      const created = await addPoll(pollData);
      setLocalPolls((prev) => [created, ...prev]);
      await addNotification({
        title: "New Poll",
        message: `"${pollTitle.trim()}" — vote now!`,
        icon: "📊",
        date: new Date().toISOString().split("T")[0],
        targetType: "polls",
      });
      setPollModal(false);
    } finally {
      setSavingPoll(false);
    }
  };

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: "grid-outline" as const },
    { key: "payments" as const, label: "Payments", icon: "card-outline" as const },
    { key: "complaints" as const, label: "Complaints", icon: "chatbox-outline" as const },
    { key: "bookings" as const, label: "Bookings", icon: "calendar-outline" as const },
    { key: "polls" as const, label: "Polls", icon: "stats-chart-outline" as const },
    { key: "notify" as const, label: "Notify", icon: "megaphone-outline" as const },
  ];

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <ScreenHeader title="Admin Dashboard" subtitle="Manage everything" showBack />

        {/* Tab Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.lg }}
          contentContainerStyle={{ flexDirection: "row", gap: spacing.sm, paddingBottom: 4 }}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingVertical: 10, paddingHorizontal: 14,
                borderRadius: radius.md,
                backgroundColor: activeTab === tab.key ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: activeTab === tab.key ? colors.primary : colors.border,
              }}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? "#fff" : colors.textMuted} />
              <Text style={{ color: activeTab === tab.key ? "#fff" : colors.textMuted, fontWeight: "600", fontSize: 12 }}>{tab.label}</Text>
              {tab.key === "bookings" && pendingBookings > 0 ? (
                <View style={{ backgroundColor: "#f59e0b", borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{pendingBookings}</Text>
                </View>
              ) : null}
              {tab.key === "complaints" && pendingComplaints > 0 ? (
                <View style={{ backgroundColor: "#ef4444", borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{pendingComplaints}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>

        {/* ─── Overview Tab ────────────────────────────────────────── */}
        {activeTab === "overview" ? (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg }}>
              {stats.map((s) => (
                <View key={s.label} style={{ width: "47%" }}>
                  <StatCard icon={s.icon} label={s.label} value={s.value} gradient={s.gradient} />
                </View>
              ))}
            </View>

            <SectionHeader title="Recent Activity" />
            <View style={{ gap: spacing.md }}>
              {SocietyData.activityLog.map((log) => (
                <GlassCard key={log.id}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: radius.md,
                      backgroundColor: `${palette.primary}15`,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 16 }}>{log.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.bodyBold, color: colors.text }}>{log.action}</Text>
                      <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>{log.details}</Text>
                      <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 4 }}>{log.date} • {log.by}</Text>
                    </View>
                  </View>
                </GlassCard>
              ))}
            </View>
          </>
        ) : null}

        {/* ─── Payment Types Tab ───────────────────────────────────── */}
        {activeTab === "payments" ? (
          <>
            <SectionHeader
              title="Manage Payment Types"
              subtitle="Add, edit, or remove"
              action={
                <Pressable onPress={() => openPayModal()} style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>+ Add</Text>
                </Pressable>
              }
            />
            <View style={{ gap: spacing.md }}>
              {payTypes.map((type) => (
                <Card key={type.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{type.name}</Text>
                      <Text style={{ color: colors.primary, fontWeight: "600" }}>{currency(type.amount)} <Text style={{ color: colors.textMuted, fontWeight: "400", fontSize: 12 }}>{type.period}</Text></Text>
                      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{type.description}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Pressable onPress={() => openPayModal(type)} style={{ padding: 8 }}>
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => deletePayType(type.id)} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        {/* ─── Complaints Tab ──────────────────────────────────────── */}
        {activeTab === "complaints" ? (
          <>
            <SectionHeader title="Manage Complaints" subtitle={`${pendingComplaints} pending • ${inProgress} in progress`} />
            <View style={{ gap: spacing.md }}>
              {complaints.filter((c) => c.status !== "Resolved").map((complaint) => (
                <Card key={complaint.id}>
                  <Text style={{ fontWeight: "700", color: colors.text }}>{complaint.icon} {complaint.title}</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{complaint.description}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{complaint.raisedBy} • {complaint.date}</Text>
                  <Badge label={complaint.status} tone={complaint.status === "In Progress" ? "info" : "warning"} />
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                    {complaint.status === "Pending" ? (
                      <Pressable
                        onPress={() => handleComplaintUpdate(complaint, "In Progress")}
                        style={{ backgroundColor: "#3b82f6", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Start Progress</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => handleComplaintUpdate(complaint, "Resolved")}
                      style={{ backgroundColor: "#22c55e", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Mark Resolved</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
              {complaints.filter((c) => c.status !== "Resolved").length === 0 ? (
                <Card>
                  <Text style={{ color: colors.textMuted, textAlign: "center" }}>All complaints resolved! 🎉</Text>
                </Card>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ─── Send Notification Tab ───────────────────────────────── */}
        {activeTab === "notify" ? (
          <>
            <SectionHeader title="Send Notification" subtitle="Broadcast to all residents" />
            <Card>
              <TextInput
                placeholder="Notification Title"
                placeholderTextColor={colors.textMuted}
                value={notifyTitle}
                onChangeText={setNotifyTitle}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              />
              <TextInput
                placeholder="Message..."
                placeholderTextColor={colors.textMuted}
                value={notifyMessage}
                onChangeText={setNotifyMessage}
                multiline
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.md, color: colors.text, minHeight: 80, textAlignVertical: "top" }}
              />
              <Pressable
                onPress={sendNotification}
                style={{ backgroundColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              >
                <Ionicons name="megaphone-outline" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Send to All</Text>
              </Pressable>
            </Card>
          </>
        ) : null}

        {/* ─── Bookings Tab ─────────────────────────────────────────── */}
        {activeTab === "bookings" ? (
          <>
            <SectionHeader
              title="Venue Bookings"
              subtitle={`${pendingBookings} awaiting approval`}
            />
            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {(["Pending", "Approved", "Cancelled", "All"] as const).map((f) => {
                  const count = f === "All" ? bookings.length : bookings.filter((b) => b.status === f).length;
                  return (
                    <Chip
                      key={f}
                      label={`${f} (${count})`}
                      active={bookingFilter === f}
                      onPress={() => setBookingFilter(f)}
                    />
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ gap: spacing.md }}>
              {bookings
                .filter((b) => bookingFilter === "All" || b.status === bookingFilter)
                .map((booking) => {
                  const statusColor =
                    booking.status === "Approved" ? "#22c55e" :
                    booking.status === "Cancelled" ? "#ef4444" : "#f59e0b";
                  return (
                    <Card key={booking.id}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>🏛️ {booking.venue}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{booking.purpose}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>📅 {booking.date} • 👤 {booking.bookedBy}</Text>
                        </View>
                        <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md }}>
                          <Text style={{ color: statusColor, fontWeight: "700", fontSize: 12 }}>{booking.status}</Text>
                        </View>
                      </View>
                      {booking.status === "Pending" ? (
                        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                          <Pressable
                            onPress={() => handleBookingAction(booking, "Approved")}
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#22c55e", paddingVertical: 10, borderRadius: radius.md }}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Approve</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleBookingAction(booking, "Rejected")}
                            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#ef4444", paddingVertical: 10, borderRadius: radius.md }}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Reject</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              {bookings.filter((b) => bookingFilter === "All" || b.status === bookingFilter).length === 0 ? (
                <Card>
                  <Text style={{ color: colors.textMuted, textAlign: "center" }}>No {bookingFilter !== "All" ? bookingFilter.toLowerCase() : ""} bookings.</Text>
                </Card>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ─── Polls Tab ────────────────────────────────────────────── */}
        {activeTab === "polls" ? (
          <>
            <SectionHeader
              title="Manage Polls"
              subtitle={`${polls.filter((p) => p.status === "Active").length} active`}
              action={
                <Pressable
                  onPress={openPollModal}
                  style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>+ Create</Text>
                </Pressable>
              }
            />
            <View style={{ gap: spacing.md }}>
              {polls.map((poll) => {
                const totalVotes = (poll.options ?? []).reduce((sum: number, o: any) => sum + (o.votes?.length ?? 0), 0);
                const isActive = poll.status === "Active";
                return (
                  <Card key={poll.id}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm }}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>📊 {poll.question}</Text>
                        {poll.description ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{poll.description}</Text> : null}
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                          {totalVotes} vote{totalVotes !== 1 ? "s" : ""} • {poll.type ?? "public"}
                          {poll.deadline ? ` • Due ${poll.deadline}` : ""}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: isActive ? "#22c55e20" : "#6b728020",
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.md,
                      }}>
                        <Text style={{ color: isActive ? "#22c55e" : "#6b7280", fontWeight: "700", fontSize: 12 }}>
                          {poll.status ?? "Active"}
                        </Text>
                      </View>
                    </View>
                    {/* Option vote bars */}
                    <View style={{ gap: 6 }}>
                      {(poll.options ?? []).map((opt: any, idx: number) => {
                        const voteCount = opt.votes?.length ?? 0;
                        const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        return (
                          <View key={idx}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{opt.text}</Text>
                              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{voteCount} ({pct}%)</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                              <View style={{ height: 6, width: `${pct}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                    {isActive ? (
                      <Pressable
                        onPress={() => handleClosePoll(poll)}
                        style={{ marginTop: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#ef444420", paddingVertical: 10, borderRadius: radius.md }}
                      >
                        <Ionicons name="stop-circle-outline" size={16} color="#ef4444" />
                        <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 13 }}>Close Poll</Text>
                      </Pressable>
                    ) : null}
                  </Card>
                );
              })}
              {polls.length === 0 ? (
                <Card>
                  <Text style={{ color: colors.textMuted, textAlign: "center" }}>No polls yet. Create one!</Text>
                </Card>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Payment Type Edit Modal */}
      <Modal visible={payModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ fontWeight: "700", fontSize: 18, color: colors.text, marginBottom: spacing.md }}>
              {editPay ? "Edit Payment Type" : "Add Payment Type"}
            </Text>
            <TextInput placeholder="Name" placeholderTextColor={colors.textMuted} value={payName} onChangeText={setPayName} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }} />
            <TextInput placeholder="Amount" placeholderTextColor={colors.textMuted} value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }} />
            <TextInput placeholder="Period" placeholderTextColor={colors.textMuted} value={payPeriod} onChangeText={setPayPeriod} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }} />
            <TextInput placeholder="Description" placeholderTextColor={colors.textMuted} value={payDesc} onChangeText={setPayDesc} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.md, color: colors.text }} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable onPress={() => setPayModal(false)} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={savePayType} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Poll Modal */}
      <Modal visible={pollModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <ScrollView style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "85%" }}>
            <View style={{ padding: spacing.lg }}>
              <Text style={{ fontWeight: "700", fontSize: 18, color: colors.text, marginBottom: spacing.md }}>Create Poll</Text>

              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Poll Question *</Text>
              <TextInput
                placeholder="e.g. Should we install new CCTV cameras?"
                placeholderTextColor={colors.textMuted}
                value={pollTitle}
                onChangeText={setPollTitle}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              />

              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Description (optional)</Text>
              <TextInput
                placeholder="Additional context..."
                placeholderTextColor={colors.textMuted}
                value={pollDesc}
                onChangeText={setPollDesc}
                multiline
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text, minHeight: 60, textAlignVertical: "top" }}
              />

              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Deadline (YYYY-MM-DD, optional)</Text>
              <TextInput
                placeholder="2025-12-31"
                placeholderTextColor={colors.textMuted}
                value={pollDeadline}
                onChangeText={setPollDeadline}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              />

              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>Visibility</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
                {(["public", "committee"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setPollType(t)}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md,
                      backgroundColor: pollType === t ? colors.primary : colors.background,
                      borderWidth: 1, borderColor: pollType === t ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: pollType === t ? "#fff" : colors.textSecondary, fontWeight: "600", fontSize: 13, textTransform: "capitalize" }}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 6 }}>Options *</Text>
              {pollOptions.map((opt, idx) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
                  <TextInput
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={colors.textMuted}
                    value={opt}
                    onChangeText={(val) => {
                      const updated = [...pollOptions];
                      updated[idx] = val;
                      setPollOptions(updated);
                    }}
                    style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, color: colors.text }}
                  />
                  {pollOptions.length > 2 ? (
                    <Pressable onPress={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <Pressable
                onPress={() => setPollOptions((prev) => [...prev, ""])}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg }}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: "600" }}>Add Option</Text>
              </Pressable>

              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
                <Pressable
                  onPress={() => setPollModal(false)}
                  style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.border, alignItems: "center" }}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={savePoll}
                  disabled={savingPoll}
                  style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: savingPoll ? colors.textMuted : colors.primary, alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{savingPoll ? "Creating..." : "Create Poll"}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};
