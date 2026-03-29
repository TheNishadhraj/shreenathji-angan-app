import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Alert, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { SectionHeader } from "../components/SectionHeader";
import { ScreenHeader } from "../components/ScreenHeader";
import { Chip } from "../components/Chip";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { spacing, radius } from "../theme/tokens";
import { formatDate } from "../utils/format";
import {
  getComplaints, setComplaints, addComplaint, updateComplaintStatus, addNotification, getSession,
  type ComplaintRecord,
} from "../utils/storage";

const filters = ["All", "Pending", "In Progress", "Resolved"];
const categories = ["Plumbing", "Electrical", "Lift", "Security", "Cleaning", "Parking", "Other"];

export const ComplaintsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [complaints, setLocalComplaints] = useState<ComplaintRecord[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // Admin response modal
  const [responseModal, setResponseModal] = useState(false);
  const [respondingTo, setRespondingTo] = useState<ComplaintRecord | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newStatus, setNewStatus] = useState("In Progress");

  const loadData = async () => {
    const session = await getSession();
    setIsAdmin(session?.role === "Admin" || session?.role === "President" || session?.role === "Secretary");
    setCurrentUser(session?.name || "You");

    const stored = await getComplaints();
    if (stored && stored.length > 0) {
      setLocalComplaints(stored);
    } else {
      // Seed from SocietyData
      const seeded = SocietyData.complaints.map((c) => ({
        ...c,
        raisedByEmail: "",
      }));
      await setComplaints(seeded);
      setLocalComplaints(seeded);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const list = complaints.filter((c) => filter === "All" || c.status === filter);

  const submitComplaint = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert("Required", "Please fill in subject and description.");
      return;
    }
    const entry = await addComplaint({
      title: subject.trim(),
      description: description.trim(),
      status: "Pending",
      category,
      date: new Date().toISOString().split("T")[0],
      raisedBy: currentUser,
      icon: "📝",
    });
    setLocalComplaints((prev) => [entry, ...prev]);
    setSubject("");
    setDescription("");

    await addNotification({
      title: "New Complaint",
      message: `"${subject.trim()}" raised by ${currentUser}`,
      icon: "📝",
      date: new Date().toISOString().split("T")[0],
      targetType: "complaints",
    });

    Alert.alert("Submitted", "Your complaint has been registered.");
  };

  const openResponseModal = (complaint: ComplaintRecord) => {
    setRespondingTo(complaint);
    setNewStatus(complaint.status === "Pending" ? "In Progress" : "Resolved");
    setAdminNote(complaint.adminNote || "");
    setResponseModal(true);
  };

  const submitResponse = async () => {
    if (!respondingTo) return;
    await updateComplaintStatus(respondingTo.id, newStatus, adminNote.trim());
    setLocalComplaints((prev) =>
      prev.map((c) =>
        c.id === respondingTo.id ? { ...c, status: newStatus, adminNote: adminNote.trim() } : c
      )
    );
    setResponseModal(false);

    await addNotification({
      title: "Complaint Updated",
      message: `"${respondingTo.title}" status changed to ${newStatus}.${adminNote.trim() ? ` Note: ${adminNote.trim()}` : ""}`,
      icon: newStatus === "Resolved" ? "✅" : "🛠️",
      date: new Date().toISOString().split("T")[0],
      targetType: "complaints",
      targetUser: respondingTo.raisedByEmail,
    });

    Alert.alert("Updated", `Complaint status changed to "${newStatus}"`);
  };

  const statusColor = (status: string) => {
    if (status === "Resolved") return "#22c55e";
    if (status === "In Progress") return "#3b82f6";
    return "#f59e0b";
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}>
      <ScreenHeader title="Complaints" showBack />

      {/* Submit New Complaint */}
      <Card>
        <Text style={{ fontWeight: "700", color: colors.text, marginBottom: spacing.sm, fontSize: 16 }}>New Complaint</Text>
        <TextInput
          placeholder="Subject"
          placeholderTextColor={colors.textMuted}
          value={subject}
          onChangeText={setSubject}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
        />
        <TextInput
          placeholder="Describe the issue in detail..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text, minHeight: 80, textAlignVertical: "top" }}
          multiline
        />
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>Category</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md }}>
          {categories.map((cat) => (
            <Chip key={cat} label={cat} active={category === cat} onPress={() => setCategory(cat)} />
          ))}
        </View>
        <Pressable onPress={submitComplaint} style={{ backgroundColor: colors.primary, padding: 14, borderRadius: radius.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Submit Complaint</Text>
        </Pressable>
      </Card>

      {/* Filters */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
        {filters.map((item) => (
          <Chip key={item} label={`${item}${item !== "All" ? ` (${complaints.filter((c) => c.status === item).length})` : ""}`} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>

      {/* Complaints List */}
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        {list.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted, textAlign: "center" }}>No complaints found</Text>
          </Card>
        ) : null}
        {list.map((complaint) => (
          <Card key={complaint.id}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{complaint.icon} {complaint.title}</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{complaint.description}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6 }}>
                  <View style={{
                    backgroundColor: statusColor(complaint.status) + "20",
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full,
                  }}>
                    <Text style={{ color: statusColor(complaint.status), fontWeight: "600", fontSize: 12 }}>{complaint.status}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{complaint.category} • {formatDate(complaint.date)}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>By: {complaint.raisedBy}</Text>
                {complaint.adminNote ? (
                  <View style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: `${colors.primary}10`, borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>Admin Note:</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{complaint.adminNote}</Text>
                  </View>
                ) : null}
              </View>
              {isAdmin && complaint.status !== "Resolved" ? (
                <Pressable
                  onPress={() => openResponseModal(complaint)}
                  style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginLeft: spacing.sm }}
                >
                  <Ionicons name="create-outline" size={16} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}
      </View>

      {/* Admin Response Modal */}
      <Modal visible={responseModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text style={{ fontWeight: "700", fontSize: 18, color: colors.text }}>Update Complaint</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md }}>"{respondingTo?.title}"</Text>

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>Status</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
              {["Pending", "In Progress", "Resolved"].map((s) => (
                <Chip key={s} label={s} active={newStatus === s} onPress={() => setNewStatus(s)} />
              ))}
            </View>

            <TextInput
              placeholder="Admin note (optional)"
              placeholderTextColor={colors.textMuted}
              value={adminNote}
              onChangeText={setAdminNote}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.md, color: colors.text, minHeight: 60, textAlignVertical: "top" }}
              multiline
            />

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable onPress={() => setResponseModal(false)} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitResponse} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
