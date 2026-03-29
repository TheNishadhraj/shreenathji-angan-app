import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View, TextInput, Pressable, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SocietyData } from "../data/societyData";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { ScreenHeader } from "../components/ScreenHeader";
import { Chip } from "../components/Chip";
import { Badge } from "../components/Badge";
import { spacing, radius, palette } from "../theme/tokens";
import { formatDate } from "../utils/format";
import { getSession, getNoticesReadList, markNoticeReadByUser } from "../utils/storage";

type Priority = "All" | "urgent" | "important" | "normal";
const PRIORITY_FILTERS: Priority[] = ["All", "urgent", "important", "normal"];

const priorityTone = (p: string): "danger" | "info" | "primary" | "accent" => {
  if (p === "urgent") return "danger";
  if (p === "important") return "info";
  return "primary";
};

const priorityBorderColor = (p: string, dangerColor: string, infoColor: string, primaryColor: string) => {
  if (p === "urgent") return dangerColor;
  if (p === "important") return infoColor;
  return primaryColor;
};

export const NoticesScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority>("All");
  const [readIds, setReadIds] = useState<number[]>([]);
  const [userEmail, setUserEmail] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await getSession();
        const email = session?.email?.toLowerCase() || "";
        setUserEmail(email);
        const read = await getNoticesReadList(email);
        setReadIds(read);
      };
      load();
    }, [])
  );

  const handleRead = async (id: number) => {
    if (!readIds.includes(id) && userEmail) {
      await markNoticeReadByUser(id, userEmail);
      setReadIds((prev) => [...prev, id]);
    }
  };

  const notices = useMemo(() => {
    return SocietyData.notices
      .filter((n) => {
        const matchPriority = priorityFilter === "All" || (n as any).priority === priorityFilter;
        const matchSearch =
          !search.trim() ||
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.postedBy.toLowerCase().includes(search.toLowerCase());
        return matchPriority && matchSearch;
      })
      .sort((a, b) => {
        // Sort: urgent first, then important, then normal; within same priority, newer first
        const order: Record<string, number> = { urgent: 0, important: 1, normal: 2 };
        const oa = order[(a as any).priority] ?? 2;
        const ob = order[(b as any).priority] ?? 2;
        if (oa !== ob) return oa - ob;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [search, priorityFilter]);

  const unreadCount = SocietyData.notices.filter(
    (n) => (n as any).priority !== "normal" && !readIds.includes(n.id)
  ).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl }}
    >
      <ScreenHeader
        title="Notice Board"
        showBack
        action={
          unreadCount > 0 ? (
            <View
              style={{
                minWidth: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: palette.danger,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                {unreadCount > 99 ? "99+" : unreadCount} new
              </Text>
            </View>
          ) : undefined
        }
      />
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, marginTop: -spacing.sm }}>
        Important updates for all residents
      </Text>

      {/* Search */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          height: 44,
          marginBottom: spacing.md,
          ...(Platform.OS === "web" ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } as any : {}),
        }}
      >
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          placeholder="Search notices..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            marginLeft: spacing.sm,
            color: colors.text,
            fontSize: 14,
            ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}),
          }}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Priority Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {PRIORITY_FILTERS.map((p) => {
            const count = p === "All"
              ? SocietyData.notices.length
              : SocietyData.notices.filter((n) => (n as any).priority === p).length;
            return (
              <Chip
                key={p}
                label={`${p.charAt(0).toUpperCase() + p.slice(1)} (${count})`}
                active={priorityFilter === p}
                onPress={() => setPriorityFilter(p)}
              />
            );
          })}
        </View>
      </ScrollView>

      {notices.length === 0 ? (
        <Card>
          <Text style={{ color: colors.textMuted, textAlign: "center" }}>No notices found.</Text>
        </Card>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {notices.map((notice) => {
          const isUnread = (notice as any).priority !== "normal" && !readIds.includes(notice.id);
          return (
            <Pressable key={notice.id} onPress={() => handleRead(notice.id)}>
              <Card
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: priorityBorderColor(
                    (notice as any).priority,
                    colors.danger ?? palette.danger,
                    colors.info ?? palette.info,
                    colors.primary
                  ),
                  opacity: isUnread ? 1 : 0.85,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm }}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                      {isUnread ? (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.danger }} />
                      ) : null}
                      <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{notice.title}</Text>
                    </View>
                  </View>
                  <Badge
                    label={(notice as any).priority.toUpperCase()}
                    tone={priorityTone((notice as any).priority)}
                  />
                </View>
                <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{notice.content}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {formatDate(notice.date)} • {notice.postedBy}
                  </Text>
                  {!isUnread ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="checkmark-done-outline" size={14} color={palette.success} />
                      <Text style={{ color: palette.success, fontSize: 11, fontWeight: "600" }}>Read</Text>
                    </View>
                  ) : (
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>Tap to mark read</Text>
                  )}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};
