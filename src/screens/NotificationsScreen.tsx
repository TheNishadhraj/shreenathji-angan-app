import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { GlassCard } from "../components/GlassCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { SocietyData } from "../data/societyData";
import { spacing, typography, radius } from "../theme/tokens";
import { getNotifications, markNotificationRead, getSession, type AppNotification } from "../utils/storage";

export const NotificationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<(AppNotification & { source: string })[]>([]);
  const [userEmail, setUserEmail] = useState("");

  const loadData = async () => {
    const session = await getSession();
    const email = session?.email || session?.name?.toLowerCase().replace(/\s/g, "") || "user";
    setUserEmail(email);

    const stored = await getNotifications();
    const staticNotifs: AppNotification[] = SocietyData.notifications.map((n) => ({
      ...n,
      read: n.read || [],
    }));

    const combined = [
      ...stored.map((n) => ({ ...n, source: "dynamic" })),
      ...staticNotifs.map((n) => ({ ...n, source: "static" })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setNotifications(combined);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleRead = async (n: AppNotification & { source: string }) => {
    if (n.source === "dynamic" && !n.read.includes(userEmail)) {
      await markNotificationRead(n.id, userEmail);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, read: [...item.read, userEmail] } : item
        )
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl }}
    >
      <ScreenHeader title="Notifications" />

      {notifications.length === 0 ? (
        <GlassCard>
          <Text style={{ ...typography.body, color: colors.textMuted, textAlign: "center" }}>No notifications yet</Text>
        </GlassCard>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {notifications.map((n) => {
          const isUnread = n.source === "dynamic" && !n.read.includes(userEmail);
          return (
            <Pressable key={`${n.source}-${n.id}`} onPress={() => handleRead(n)}>
              <GlassCard>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: isUnread ? `${colors.primary}20` : colors.overlay,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{n.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <Text style={{ ...typography.bodyBold, color: colors.text, flex: 1 }}>{n.title}</Text>
                      {isUnread ? (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                      ) : null}
                    </View>
                    <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: 2 }}>
                      {n.message}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: 4 }}>
                      {n.date}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};
