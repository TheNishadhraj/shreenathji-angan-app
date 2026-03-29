import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { spacing, radius, cardGradients, shadows, palette } from "../theme/tokens";
import { getPolls, getComplaints, getNotifications, getSession } from "../utils/storage";

export const SocietyScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [activePollsCount, setActivePollsCount] = useState(0);
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);
  const [openComplaintsCount, setOpenComplaintsCount] = useState(0);
  const [isCommittee, setIsCommittee] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await getSession();
        const committeeRoles = ["President", "Vice President", "Secretary", "Treasurer", "Committee Member", "Admin"];
        setIsCommittee(committeeRoles.includes(session?.role ?? ""));

        // Active polls count
        const polls = await getPolls();
        const allPolls = polls ?? SocietyData.polls;
        setActivePollsCount(allPolls.filter((p: any) => p.status === "Active").length);

        // Unread priority notices (urgent + important not yet acknowledged)
        const userEmail = session?.email?.toLowerCase() || "";
        const readKey = `sa_notices_read_${userEmail}`;
        const raw = await AsyncStorage.getItem(readKey);
        const readIds: number[] = raw ? JSON.parse(raw) : [];
        const urgentUnread = SocietyData.notices.filter(
          (n) => (n.priority === "urgent" || n.priority === "important") && !readIds.includes(n.id)
        ).length;
        setUnreadNoticesCount(urgentUnread);

        // Open complaints
        const complaints = await getComplaints();
        const allComplaints = complaints ?? SocietyData.complaints;
        setOpenComplaintsCount(allComplaints.filter((c: any) => c.status !== "Resolved").length);
      };
      load();
    }, [])
  );

  const societyItems = [
    {
      label: "Committee",
      icon: "👥",
      screen: "Committee",
      description: "View society committee members",
      badge: null,
    },
    {
      label: "News & Updates",
      icon: "📰",
      screen: "News",
      description: "Latest society news and updates",
      badge: null,
    },
    {
      label: "Rules & Regulations",
      icon: "📜",
      screen: "Rules",
      description: "Society bylaws and guidelines",
      badge: null,
    },
    {
      label: "Polls & Votes",
      icon: "🗳️",
      screen: "Polls",
      description: "Participate in society decisions",
      badge: activePollsCount > 0 ? activePollsCount : null,
      badgeColor: palette.success,
    },
    {
      label: "Notice Board",
      icon: "📋",
      screen: "Notices",
      description: "Official notices and announcements",
      badge: unreadNoticesCount > 0 ? unreadNoticesCount : null,
      badgeColor: palette.danger,
    },
    {
      label: "Member Directory",
      icon: "👨‍👩‍👧‍👦",
      screen: "Directory",
      description: "Find and contact residents",
      badge: null,
    },
    ...(isCommittee
      ? [{
          label: "Complaints",
          icon: "📝",
          screen: "Complaints",
          description: `${openComplaintsCount} open issue${openComplaintsCount !== 1 ? "s" : ""}`,
          badge: openComplaintsCount > 0 ? openComplaintsCount : null,
          badgeColor: palette.warning,
        }]
      : []),
  ] as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
    >
      <ScreenHeader title="Society" />
      <View style={{ gap: spacing.sm }}>
        {societyItems.map((item, idx) => {
          const grad = cardGradients[idx % cardGradients.length];
          return (
            <Pressable
              key={item.label}
              onPress={() => navigation.navigate(item.screen as never)}
            >
              <Card style={shadows.soft}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View style={{ width: 48, height: 48, borderRadius: radius.md, overflow: "hidden" }}>
                    <LinearGradient
                      colors={[grad[0], grad[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                    </LinearGradient>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 13 }}>
                      {item.description}
                    </Text>
                  </View>
                  {"badge" in item && item.badge ? (
                    <View
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: (item as any).badgeColor ?? palette.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 5,
                        marginRight: spacing.xs,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                        {(item as any).badge > 99 ? "99+" : (item as any).badge}
                      </Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};
