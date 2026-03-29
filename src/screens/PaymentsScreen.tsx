import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Animated, Alert, Modal } from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Badge } from "../components/Badge";
import { ScreenHeader } from "../components/ScreenHeader";
import { spacing, radius } from "../theme/tokens";
import { currency, formatDate } from "../utils/format";
import {
  getPaymentTypes, setPaymentTypes, getPaymentHistory, addPaymentRecord,
  addNotification, getSession,
  type PaymentType, type PaymentRecord,
} from "../utils/storage";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: "📱" },
  { id: "phonepe", label: "PhonePe", icon: "📲" },
  { id: "gpay", label: "Google Pay", icon: "💰" },
  { id: "paytm", label: "Paytm", icon: "💸" },
  { id: "mobikwik", label: "Mobikwik", icon: "📳" },
  { id: "card", label: "Card", icon: "💳" },
  { id: "netbanking", label: "Net Banking", icon: "🏦" },
  { id: "neft", label: "NEFT/RTGS", icon: "🔗" },
  { id: "wallet", label: "Wallet", icon: "👛" },
];

export const PaymentsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const highlightPending = (route.params as any)?.highlightPending === true;

  const [paymentTypes, setLocalTypes] = useState<PaymentType[]>([]);
  const [selectedType, setSelectedType] = useState<PaymentType | null>(null);
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin modal state
  const [editModal, setEditModal] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Pending buzzing animation
  const buzzAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (highlightPending) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(buzzAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(buzzAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(buzzAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(buzzAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.delay(1500),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [highlightPending]);

  const buzzTranslate = buzzAnim.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] });

  const loadData = async () => {
    const session = await getSession();
    setIsAdmin(session?.role === "Admin" || session?.role === "President" || session?.role === "Secretary");

    const stored = await getPaymentTypes();
    const types = stored ?? SocietyData.paymentTypes.map((t) => ({
      id: t.id, name: t.name, amount: t.amount, period: t.period, description: t.description,
    }));
    setLocalTypes(types);
    if (!selectedType && types.length > 0) setSelectedType(types[0]);

    const hist = await getPaymentHistory();
    if (hist.length > 0) {
      setHistory(hist);
    } else {
      setHistory(SocietyData.paymentHistory as PaymentRecord[]);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handlePayment = async () => {
    if (!selectedType) return;
    const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label || selectedMethod;
    const record: Omit<PaymentRecord, "id"> = {
      date: new Date().toISOString().split("T")[0],
      type: selectedType.name,
      amount: selectedType.amount,
      method,
      status: "Paid",
      reference: `TXN-SA-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const entry = await addPaymentRecord(record);
    setHistory((prev) => [entry, ...prev]);

    await addNotification({
      title: "Payment Successful",
      message: `${selectedType.name} payment of ${currency(selectedType.amount)} via ${method} completed.`,
      icon: "✅",
      date: new Date().toISOString().split("T")[0],
      targetType: "payments",
    });

    Alert.alert("Payment Successful", `${selectedType.name} - ${currency(selectedType.amount)} paid via ${method}\nRef: ${entry.reference}`);
  };

  // ─── Admin: Add/Edit/Delete Payment Types ──────────────────────
  const openEditModal = (type?: PaymentType) => {
    if (type) {
      setEditingType(type);
      setEditName(type.name);
      setEditAmount(String(type.amount));
      setEditPeriod(type.period);
      setEditDesc(type.description);
    } else {
      setEditingType(null);
      setEditName("");
      setEditAmount("");
      setEditPeriod("per month");
      setEditDesc("");
    }
    setEditModal(true);
  };

  const savePaymentType = async () => {
    if (!editName.trim()) return;
    const amount = Number(editAmount) || 0;
    let updated: PaymentType[];
    if (editingType) {
      updated = paymentTypes.map((t) =>
        t.id === editingType.id ? { ...t, name: editName.trim(), amount, period: editPeriod.trim(), description: editDesc.trim() } : t
      );
    } else {
      const newType: PaymentType = { id: Date.now(), name: editName.trim(), amount, period: editPeriod.trim(), description: editDesc.trim() };
      updated = [...paymentTypes, newType];
    }
    await setPaymentTypes(updated);
    setLocalTypes(updated);
    setEditModal(false);

    await addNotification({
      title: "Payment Type Updated",
      message: `${editingType ? "Updated" : "New"}: ${editName.trim()} - ${currency(amount)}`,
      icon: "💳",
      date: new Date().toISOString().split("T")[0],
      targetType: "all",
    });
  };

  const deletePaymentType = async (id: number) => {
    const type = paymentTypes.find((t) => t.id === id);
    Alert.alert("Delete Payment Type", `Are you sure you want to remove "${type?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const updated = paymentTypes.filter((t) => t.id !== id);
          await setPaymentTypes(updated);
          setLocalTypes(updated);
          if (selectedType?.id === id) setSelectedType(updated[0] ?? null);

          await addNotification({
            title: "Payment Type Removed",
            message: `"${type?.name}" has been removed from payment types.`,
            icon: "🗑️",
            date: new Date().toISOString().split("T")[0],
            targetType: "all",
          });
        },
      },
    ]);
  };

  const pendingPayments = history.filter((h) => h.status === "Pending");
  const paidPayments = history.filter((h) => h.status === "Paid");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}>
<ScreenHeader title="Payments" showBack />

      {/* Pending Payments - Red Highlight + Buzz */}
      {pendingPayments.length > 0 ? (
        <>
          <SectionHeader title="Pending Payments" subtitle="Action required" />
          <View style={{ gap: spacing.md }}>
            {pendingPayments.map((item) => (
              <Animated.View
                key={item.id}
                style={highlightPending ? { transform: [{ translateX: buzzTranslate }] } : undefined}
              >
                <Card style={{
                  borderWidth: 2,
                  borderColor: "#ef4444",
                  backgroundColor: highlightPending ? "#fef2f2" : colors.card,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: "#ef4444", fontSize: 16 }}>⚠️ {item.type}</Text>
                      <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 18, marginTop: 4 }}>{currency(item.amount)}</Text>
                      <Text style={{ color: colors.textMuted, marginTop: 2 }}>{item.method} • {formatDate(item.date)}</Text>
                    </View>
                    <Badge label="PENDING" tone="danger" />
                  </View>
                </Card>
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}

      {/* Payment Types */}
      <SectionHeader
        title="Payment Types"
        subtitle={isAdmin ? "Tap to select • Long press to edit" : "Select a payment type"}
        action={isAdmin ? (
          <Pressable onPress={() => openEditModal()} style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>+ Add</Text>
          </Pressable>
        ) : undefined}
      />
      <View style={{ gap: spacing.md }}>
        {paymentTypes.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => setSelectedType(type)}
            onLongPress={isAdmin ? () => openEditModal(type) : undefined}
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: selectedType?.id === type.id ? colors.primary : colors.border,
              backgroundColor: selectedType?.id === type.id ? `${colors.primary}10` : colors.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{type.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: "600", marginTop: 2 }}>{currency(type.amount)} <Text style={{ color: colors.textMuted, fontWeight: "400", fontSize: 12 }}>{type.period}</Text></Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{type.description}</Text>
              </View>
              {isAdmin ? (
                <Pressable onPress={() => deletePaymentType(type.id)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Payment Methods */}
      <SectionHeader title="Payment Method" subtitle="UPI, PhonePe, GPay, Paytm, Mobikwik & more" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {PAYMENT_METHODS.map((method) => (
          <Pressable
            key={method.id}
            onPress={() => setSelectedMethod(method.id)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: radius.full,
              borderWidth: 1.5,
              borderColor: selectedMethod === method.id ? colors.primary : colors.border,
              backgroundColor: selectedMethod === method.id ? `${colors.primary}15` : colors.card,
            }}
          >
            <Text style={{ fontSize: 16 }}>{method.icon}</Text>
            <Text style={{ color: selectedMethod === method.id ? colors.primary : colors.text, fontWeight: selectedMethod === method.id ? "700" : "500", fontSize: 13 }}>
              {method.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Pay Button */}
      <Pressable
        onPress={handlePayment}
        style={{
          marginTop: spacing.lg,
          backgroundColor: colors.primary,
          padding: 16,
          borderRadius: radius.md,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: spacing.sm,
        }}
      >
        <Ionicons name="card-outline" size={20} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
          Pay {selectedType?.name} — {selectedType ? currency(selectedType.amount) : ""}
        </Text>
      </Pressable>

      {/* Payment History */}
      <SectionHeader title="Payment History" subtitle={`${history.length} transactions`} />
      <View style={{ gap: spacing.md }}>
        {paidPayments.slice(0, 20).map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>{item.type}</Text>
                <Text style={{ color: colors.textSecondary }}>{currency(item.amount)} • {item.method}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(item.date)} • {item.reference}</Text>
              </View>
              <Badge label={item.status} tone={item.status === "Paid" ? "success" : "warning"} />
            </View>
          </Card>
        ))}
      </View>

      {/* Admin Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ fontWeight: "700", fontSize: 18, color: colors.text, marginBottom: spacing.md }}>
              {editingType ? "Edit Payment Type" : "Add Payment Type"}
            </Text>
            <TextInput
              placeholder="Name (e.g. Maintenance)"
              placeholderTextColor={colors.textMuted}
              value={editName}
              onChangeText={setEditName}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
            />
            <TextInput
              placeholder="Amount"
              placeholderTextColor={colors.textMuted}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
            />
            <TextInput
              placeholder="Period (e.g. per month)"
              placeholderTextColor={colors.textMuted}
              value={editPeriod}
              onChangeText={setEditPeriod}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
            />
            <TextInput
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              value={editDesc}
              onChangeText={setEditDesc}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.md, color: colors.text }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => setEditModal(false)}
                style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={savePaymentType}
                style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
