import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Chip } from "../components/Chip";
import { spacing, radius, palette } from "../theme/tokens";
import { formatDate } from "../utils/format";
import {
  getSession,
  addNewsArticle,
  getNewsArticles,
  addNotification,
  type NewsArticle,
} from "../utils/storage";

const NEWS_CATEGORIES = ["All", "Announcement", "Event", "Maintenance", "Rules", "Finance", "Community", "Update"];

export const NewsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("Committee");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Post modal
  const [postModal, setPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postDesc, setPostDesc] = useState("");
  const [postCategory, setPostCategory] = useState("Announcement");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await getSession();
        const adminRoles = ["Admin", "President", "Secretary", "Vice President"];
        setIsAdmin(adminRoles.includes(session?.role ?? ""));
        setAdminName(session?.name ?? "Committee");

        const stored = await getNewsArticles();
        if (stored && stored.length > 0) {
          setArticles(stored);
        } else {
          // Use SocietyData as seed
          setArticles(
            SocietyData.news.map((n) => ({
              id: n.id,
              title: n.title,
              description: n.description,
              category: n.category,
              date: n.date,
              postedBy: (n as any).postedBy ?? "Committee",
            }))
          );
        }
      };
      load();
    }, [])
  );

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const matchCat = categoryFilter === "All" || a.category === categoryFilter;
      const matchSearch =
        !search.trim() ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [articles, search, categoryFilter]);

  const handlePost = async () => {
    if (!postTitle.trim() || !postDesc.trim()) {
      Alert.alert("Required", "Title and description are required.");
      return;
    }
    const entry = await addNewsArticle({
      title: postTitle.trim(),
      description: postDesc.trim(),
      category: postCategory,
      date: new Date().toISOString().split("T")[0],
      postedBy: adminName,
    });
    setArticles((prev) => [entry, ...prev]);
    setPostModal(false);
    setPostTitle("");
    setPostDesc("");
    setPostCategory("Announcement");

    await addNotification({
      title: "New Article Posted",
      message: `"${entry.title}" — ${entry.category}`,
      icon: "📰",
      date: entry.date,
      targetType: "all",
    });

    Alert.alert("Published", "Your news article has been published.");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md }}
    >
      <ScreenHeader
        title="News & Updates"
        showBack
        action={
          isAdmin ? (
            <Pressable
              onPress={() => setPostModal(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: palette.primary,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.full,
              }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Post</Text>
            </Pressable>
          ) : undefined
        }
      />
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.md, marginTop: -spacing.sm }}>
        Latest society highlights
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
          placeholder="Search news..."
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

      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {NEWS_CATEGORIES.filter((c) => c === "All" || articles.some((a) => a.category === c)).map((cat) => (
            <Chip key={cat} label={cat} active={categoryFilter === cat} onPress={() => setCategoryFilter(cat)} />
          ))}
        </View>
      </ScrollView>

      {filtered.length === 0 ? (
        <Card>
          <Text style={{ color: colors.textMuted, textAlign: "center" }}>No articles found.</Text>
        </Card>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {filtered.map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm, alignItems: "center" }}>
              <Badge label={item.category} tone="info" />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(item.date)}</Text>
            </View>
            <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15, marginBottom: 4 }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{item.description}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: spacing.sm }}>
              Posted by {item.postedBy}
            </Text>
          </Card>
        ))}
      </View>

      {/* Admin Post Modal */}
      <Modal visible={postModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.xl ?? 24,
              borderTopRightRadius: radius.xl ?? 24,
              padding: spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
              <Text style={{ fontWeight: "700", fontSize: 18, color: colors.text }}>📰 Post News Article</Text>
              <Pressable onPress={() => setPostModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              placeholder="Title *"
              placeholderTextColor={colors.textMuted}
              value={postTitle}
              onChangeText={setPostTitle}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                fontSize: 15,
                fontWeight: "600",
              }}
            />
            <TextInput
              placeholder="Description *"
              placeholderTextColor={colors.textMuted}
              value={postDesc}
              onChangeText={setPostDesc}
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {NEWS_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                  <Chip key={cat} label={cat} active={postCategory === cat} onPress={() => setPostCategory(cat)} />
                ))}
              </View>
            </ScrollView>

            <Pressable
              onPress={handlePost}
              style={{ borderRadius: radius.md, overflow: "hidden" }}
            >
              <LinearGradient
                colors={[palette.primary, palette.primaryLight ?? palette.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 14, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Publish Article</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
