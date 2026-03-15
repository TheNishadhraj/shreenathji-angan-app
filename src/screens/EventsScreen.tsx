import React, { useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionHeader } from "../components/SectionHeader";
import { Chip } from "../components/Chip";
import { Card } from "../components/Card";
import { spacing, radius, palette, shadows } from "../theme/tokens";
import { timeAgo } from "../utils/format";

const filters = ["All", "Festivals", "National", "Sports", "Health", "Community"];

export const EventsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");

  const events = useMemo(() => {
    return SocietyData.gallery.filter((item) => filter === "All" || item.category === filter);
  }, [filter]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <ScreenHeader title="Events & Memories" action={
        <Pressable onPress={() => setShowCreate((prev) => !prev)} style={{ borderRadius: radius.full, overflow: "hidden" }}>
          <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: spacing.md, paddingVertical: 6 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>✨ Create Post</Text>
          </LinearGradient>
        </Pressable>
      } />

      {showCreate ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={{ fontWeight: "700", color: colors.text, marginBottom: spacing.sm }}>Create a new event highlight</Text>
          <TextInput
            placeholder="Event Title"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
          />
          <TextInput
            placeholder="Caption"
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
            multiline
          />
          <Pressable onPress={() => { setTitle(""); setCaption(""); }} style={{ borderRadius: radius.md, overflow: "hidden" }}>
            <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 12, borderRadius: radius.md, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Post Event</Text>
            </LinearGradient>
          </Pressable>
        </Card>
      ) : null}

      <SectionHeader title="🔥 Trending" subtitle="Top events by likes" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {SocietyData.gallery.slice(0, 6).map((item) => (
          <View key={item.id} style={{ marginRight: spacing.sm, width: 150, borderRadius: radius.lg, overflow: "hidden", ...shadows.soft }}>
            <LinearGradient colors={[...item.gradient] as [string, string]} style={{ padding: spacing.md, minHeight: 120, justifyContent: "flex-end" }}>
              <Text style={{ fontSize: 28 }}>{item.icon}</Text>
              <Text style={{ fontWeight: "700", color: "#fff", marginTop: 6, fontSize: 14 }}>{item.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{item.likes.length} likes</Text>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
        {filters.map((item) => (
          <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {events.map((item) => (
          <Card key={item.id} style={shadows.soft}>
            <View style={{ borderRadius: radius.md, overflow: "hidden", marginBottom: spacing.sm }}>
              <LinearGradient colors={[...item.gradient] as [string, string]} style={{ padding: spacing.xl, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 44 }}>{item.icon}</Text>
                <Text style={{ color: "#fff", fontWeight: "700", marginTop: 8, fontSize: 17 }}>{item.title}</Text>
              </LinearGradient>
            </View>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>❤️ {item.likes.length} likes</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{timeAgo(item.date)}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>{item.caption}</Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};
