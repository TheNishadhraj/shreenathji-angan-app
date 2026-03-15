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
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Chip } from "../components/Chip";
import { spacing, typography, radius, palette, cardGradients } from "../theme/tokens";
import { currency } from "../utils/format";
import {
  getComplaints, updateComplaintStatus, getPaymentTypes, setPaymentTypes,
  addNotification, getNotifications,
  type PaymentType, type ComplaintRecord,
} from "../utils/storage";

export const AdminScreen: React.FC = () => {
  const { colors } = useTheme();
  const [complaints, setLocalComplaints] = useState<ComplaintRecord[]>([]);
  const [payTypes, setLocalPayTypes] = useState<PaymentType[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "complaints" | "notify">("overview");

  // Notify modal
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");

  // Payment type edit modal
  const [payModal, setPayModal] = useState(false);
  const [editPay, setEditPay] = useState<PaymentType | null>(null);
  const [payName, setPayName] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [payDesc, setPayDesc] = useState("");

  const loadData = async () => {
    const storedComplaints = await getComplaints();
    setLocalComplaints(storedComplaints ?? SocietyData.complaints.map((c) => ({ ...c, raisedByEmail: "" })));

    const storedTypes = await getPaymentTypes();
    setLocalPayTypes(storedTypes ?? SocietyData.paymentTypes.map((t) => ({
      id: t.id, name: t.name, amount: t.amount, period: t.period, description: t.description,
    })));
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const pendingComplaints = complaints.filter((c) => c.status === "Pending").length;
  const inProgress = complaints.filter((c) => c.status === "In Progress").length;
  const pendingBookings = SocietyData.bookings.filter((b) => b.status === "Pending").length;
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

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: "grid-outline" as const },
    { key: "payments" as const, label: "Payments", icon: "card-outline" as const },
    { key: "complaints" as const, label: "Complaints", icon: "chatbox-outline" as const },
    { key: "notify" as const, label: "Notify", icon: "megaphone-outline" as const },
  ];

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <SectionHeader title="Admin Dashboard" subtitle="Manage everything" size="lg" style={{ marginTop: spacing.lg }} />

        {/* Tab Selector */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: activeTab === tab.key ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: activeTab === tab.key ? colors.primary : colors.border,
              }}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? "#fff" : colors.textMuted} />
              <Text style={{ color: activeTab === tab.key ? "#fff" : colors.textMuted, fontWeight: "600", fontSize: 12 }}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

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
    </ScreenWrapper>
  );
};
