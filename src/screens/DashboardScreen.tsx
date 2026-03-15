import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Dimensions, Platform, Animated } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { Card } from "../components/Card";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/Badge";
import { radius, spacing, palette } from "../theme/tokens";
import { currency, formatDate } from "../utils/format";
import { getActionUsage, setActionUsage, getNotifications, getComplaints } from "../utils/storage";

type DashboardScreenProps = {
  user: {
    name: string;
    role: string;
  };
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ user }) => {
  const { colors, toggle, isDark } = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openComplaints, setOpenComplaints] = useState(0);
  const [complaintBreakdown, setComplaintBreakdown] = useState({ pending: 0, inProgress: 0, resolved: 0 });
  const [networkLabel, setNetworkLabel] = useState("5G Ready");
  const leaderRoles = ["President", "Vice President", "Secretary", "Treasurer"];
  const isLeader = leaderRoles.includes(user.role);
  const isAdmin = ["Admin", "President", "Secretary"].includes(user.role);
  const firstName = user.name?.split(" ")[0] || "Resident";
  const [quickActions, setQuickActions] = useState([
    { id: "pay", title: "Pay Dues", icon: "💳", screen: "Payments" },
    { id: "complaint", title: "Raise Complaint", icon: "📝", screen: "Complaints" },
    { id: "book", title: "Book Venue", icon: "🏛️", screen: "Booking" },
    { id: "events", title: "Events", icon: "🎉", screen: "Events" },
    { id: "contacts", title: "Contacts", icon: "📞", screen: "Contacts" },
    { id: "rules", title: "Rules", icon: "📜", screen: "Rules" }
  ]);

  // ─── Search Index ──────────────────────────────────────────────
  type SearchItem = { label: string; screen: string; params?: any; icon: string; category: string };
  const searchIndex = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    // Screens
    items.push(
      { label: "Payments", screen: "Payments", icon: "💳", category: "Screen" },
      { label: "Complaints", screen: "Complaints", icon: "📝", category: "Screen" },
      { label: "Booking", screen: "Booking", icon: "🏛️", category: "Screen" },
      { label: "Events", screen: "Events", icon: "🎉", category: "Screen" },
      { label: "Contacts", screen: "Contacts", icon: "📞", category: "Screen" },
      { label: "Rules", screen: "Rules", icon: "📜", category: "Screen" },
      { label: "Directory", screen: "Directory", icon: "📖", category: "Screen" },
      { label: "Committee", screen: "Committee", icon: "👥", category: "Screen" },
      { label: "News", screen: "News", icon: "📰", category: "Screen" },
      { label: "Polls", screen: "Polls", icon: "🗳️", category: "Screen" },
      { label: "Notifications", screen: "Notifications", icon: "🔔", category: "Screen" },
      { label: "Profile", screen: "Profile", icon: "👤", category: "Screen" },
    );
    if (isAdmin) items.push({ label: "Admin Dashboard", screen: "Admin", icon: "🛡️", category: "Screen" });
    // Contacts
    SocietyData.contacts.forEach((c) => {
      items.push({ label: `${c.name} (${c.category})`, screen: "Contacts", icon: c.icon, category: "Contact" });
    });
    // Committee members
    SocietyData.committee.forEach((m) => {
      items.push({ label: `${m.name} - ${m.position}`, screen: "Committee", icon: "👤", category: "Committee" });
    });
    // News
    SocietyData.news.forEach((n) => {
      items.push({ label: n.title, screen: "News", icon: "📰", category: "News" });
    });
    // Users for directory
    SocietyData.users.slice(0, 50).forEach((u) => {
      items.push({ label: `${u.name} (${u.flat})`, screen: "Directory", icon: "🏠", category: "Resident" });
    });
    // Payment types
    SocietyData.paymentTypes.forEach((p) => {
      items.push({ label: `Pay ${p.name} - ${currency(p.amount)}`, screen: "Payments", icon: "💳", category: "Payment" });
    });
    return items;
  }, [isAdmin]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex
      .filter((item) => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, searchIndex]);

  // ─── Notification Badge + Complaints Count ────────────────────
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await getNotifications();
        const staticNotifs = SocietyData.notifications;
        const allNotifs = [...stored, ...staticNotifs];
        const email = user.name?.toLowerCase().replace(/\s/g, "") || "user";
        const unread = allNotifs.filter((n: any) => !n.read?.includes(email)).length;
        setUnreadCount(unread);

        const storedComplaints = await getComplaints();
        const complaints = storedComplaints ?? SocietyData.complaints;
        setOpenComplaints(complaints.filter((c: any) => c.status !== "Resolved").length);
        setComplaintBreakdown({
          pending: complaints.filter((c: any) => c.status === "Pending").length,
          inProgress: complaints.filter((c: any) => c.status === "In Progress").length,
          resolved: complaints.filter((c: any) => c.status === "Resolved").length,
        });
      };
      load();
    }, [user.name])
  );

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const type = state.details && "cellularGeneration" in state.details ? state.details.cellularGeneration : undefined;
      if (type) setNetworkLabel(String(type).toUpperCase());
    });
  }, []);

  useEffect(() => {
    const reorder = async () => {
      const usage = await getActionUsage();
      const sorted = [...quickActions].sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0));
      setQuickActions(sorted);
    };
    reorder();
  }, []);

  const stats = useMemo(() => [
    { label: "Total Houses", value: SocietyData.society.totalHouses, icon: "🏢", screen: "HouseDetails", params: { mode: "houses" } },
    { label: "Total Residents", value: SocietyData.society.totalResidents, icon: "👨‍👩‍👧‍👦", screen: "HouseDetails", params: { mode: "residents" } },
    { label: "Pending Amount", value: currency(2500), icon: "💸", screen: "Payments", params: { highlightPending: true } },
    { label: "Open Complaints", value: openComplaints, icon: "📝", screen: "Complaints" }
  ], [openComplaints]);

  const handleAction = async (action: typeof quickActions[number]) => {
    const usage = await getActionUsage();
    usage[action.id] = (usage[action.id] || 0) + 1;
    await setActionUsage(usage);
    navigation.navigate(action.screen as never);
  };

  const chartWidth = Dimensions.get("window").width - spacing.lg * 2;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
      <ScreenHeader
        title="Dashboard"
        action={
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable
              onPress={() => (navigation as any).navigate("Notifications")}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {unreadCount > 0 ? (
                <View style={{
                  position: "absolute", top: -2, right: -2,
                  backgroundColor: "#ef4444", borderRadius: 10,
                  minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={toggle}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      {/* Global Search Bar */}
      <View style={{ zIndex: 100 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: showSuggestions && searchResults.length > 0 ? colors.primary : colors.border,
            paddingHorizontal: spacing.md,
            height: 44,
            marginBottom: showSuggestions && searchResults.length > 0 ? 0 : spacing.md,
            ...(Platform.OS === "web" ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } as any : {}),
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search screens, contacts, residents..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              color: colors.text,
              fontSize: 15,
              ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}),
            }}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => { setSearchQuery(""); setShowSuggestions(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && searchResults.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              marginBottom: spacing.md,
              overflow: "hidden",
              ...(Platform.OS === "web" ? { boxShadow: "0 8px 24px rgba(0,0,0,0.15)" } as any : { elevation: 8 }),
            }}
          >
            {searchResults.map((item, i) => (
              <Pressable
                key={`${item.label}-${i}`}
                onPress={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                  (navigation as any).navigate(item.screen, item.params);
                }}
                style={({ pressed }: { pressed: boolean }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  padding: spacing.md,
                  backgroundColor: pressed ? colors.border : "transparent",
                  borderBottomWidth: i < searchResults.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                })}
              >
                <Text style={{ fontSize: 20, width: 32 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>{item.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <Card style={{ backgroundColor: colors.primary }}>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Good Day, {firstName} 👋</Text>
        <Text style={{ color: "#ecfeff", marginTop: 6 }}>Role: {user.role} • Live updates and AI-personalized shortcuts are ready.</Text>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md }}>
        {stats.map((stat) => (
          <Pressable
            key={stat.label}
            style={{ flexBasis: "48%" }}
            onPress={() => stat.screen ? (navigation as any).navigate(stat.screen, stat.params) : undefined}
          >
            <StatCard icon={stat.icon} label={stat.label} value={stat.value} />
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Quick Actions" subtitle="AI-personalized for you" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {quickActions.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => handleAction(action)}
            style={{
              flexBasis: "48%",
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md
            }}
          >
            <Text style={{ fontSize: 22 }}>{action.icon}</Text>
            <Text style={{ fontWeight: "700", marginTop: 6, color: colors.text }}>{action.title}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>Tap to open</Text>
          </Pressable>
        ))}
      </View>

      {isLeader ? (
        <>
          <SectionHeader title="Leadership Tools" subtitle="Slightly more functions for core leaders" />
          <View style={{ gap: spacing.sm }}>
            <Card>
              <Text style={{ fontWeight: "700", color: colors.text }}>📢 Post Updates</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Create notices and keep residents informed.</Text>
              <Pressable
                onPress={() => navigation.navigate("News" as never)}
                style={{ marginTop: spacing.sm, backgroundColor: colors.secondary, padding: 12, borderRadius: radius.md, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Open News</Text>
              </Pressable>
            </Card>
            <Card>
              <Text style={{ fontWeight: "700", color: colors.text }}>📝 Review Issues</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Track complaints and respond quickly.</Text>
              <Pressable
                onPress={() => navigation.navigate("Complaints" as never)}
                style={{ marginTop: spacing.sm, backgroundColor: colors.primary, padding: 12, borderRadius: radius.md, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Open Complaints</Text>
              </Pressable>
            </Card>
            <Card>
              <Text style={{ fontWeight: "700", color: colors.text }}>💳 Finance Snapshot</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Monitor dues and collections at a glance.</Text>
              <Pressable
                onPress={() => navigation.navigate("Payments" as never)}
                style={{ marginTop: spacing.sm, backgroundColor: colors.info, padding: 12, borderRadius: radius.md, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Open Payments</Text>
              </Pressable>
            </Card>
            {isAdmin ? (
              <Card>
                <Text style={{ fontWeight: "700", color: colors.text }}>🛡️ Admin Hub</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Full admin access enabled for your role.</Text>
                <Pressable
                  onPress={() => navigation.navigate("Admin" as never)}
                  style={{ marginTop: spacing.sm, backgroundColor: colors.secondary, padding: 12, borderRadius: radius.md, alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Open Admin</Text>
                </Pressable>
              </Card>
            ) : null}
          </View>
        </>
      ) : null}

      <SectionHeader title="Payment Overview" action={<Badge label="Last 6 Months" tone="info" />} />
      <Card>
        <BarChart
          data={{
            labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
            datasets: [{ data: [12000, 13500, 14000, 15000, 16000, 17500] }]
          }}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: colors.card,
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            color: () => colors.primary,
            labelColor: () => colors.textSecondary
          }}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
          style={{ borderRadius: radius.md }}
        />
      </Card>

      <SectionHeader title="Complaint Status" action={<Badge label="Live" tone="warning" />} />
      <Card>
        <PieChart
          data={[
            { name: "Pending", population: complaintBreakdown.pending || 0.01, color: colors.warning, legendFontColor: colors.textSecondary, legendFontSize: 12 },
            { name: "In Progress", population: complaintBreakdown.inProgress || 0.01, color: colors.info, legendFontColor: colors.textSecondary, legendFontSize: 12 },
            { name: "Resolved", population: complaintBreakdown.resolved || 0.01, color: colors.success, legendFontColor: colors.textSecondary, legendFontSize: 12 }
          ]}
          width={chartWidth}
          height={220}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          chartConfig={{
            color: () => colors.textSecondary
          }}
        />
      </Card>

      <SectionHeader title="Latest News" action={<Badge label="Society" tone="primary" />} />
      <Card>
        {SocietyData.news.slice(0, 4).map((news) => (
          <View key={news.id} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontWeight: "700", color: colors.text }}>{news.title}</Text>
            <Text style={{ color: colors.textSecondary }}>{news.category}</Text>
            <Text style={{ color: colors.textMuted }}>{formatDate(news.date)}</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Future Ready Modules" subtitle="Voice, Biometrics, AR, Live Activities" />
      <View style={{ gap: spacing.sm }}>
        <Card>
          <Text style={{ fontWeight: "700", color: colors.text }}>🎙️ Voice Recognition & Search</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Hands-free search and navigation is ready for activation.</Text>
        </Card>
        <Card>
          <Text style={{ fontWeight: "700", color: colors.text }}>🔐 Biometric Authentication</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Face ID / fingerprint ready on supported devices.</Text>
        </Card>
        <Card>
          <Text style={{ fontWeight: "700", color: colors.text }}>🪞 AR Preview</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Overlay society venues in AR with future ARKit/ARCore bridges.</Text>
        </Card>
      </View>
    </ScrollView>
  );
};
