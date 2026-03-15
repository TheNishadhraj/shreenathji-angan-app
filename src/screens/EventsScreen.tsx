import React, { useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionHeader } from "../components/SectionHeader";
import { Chip } from "../components/Chip";
import { Card } from "../components/Card";
import { spacing, radius } from "../theme/tokens";
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
        <Pressable onPress={() => setShowCreate((prev) => !prev)} style={{ paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: radius.full }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>✨ Create Post</Text>
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
          <Pressable onPress={() => { setTitle(""); setCaption(""); }} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: radius.md, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Post Event</Text>
          </Pressable>
        </Card>
      ) : null}

      <SectionHeader title="🔥 Trending" subtitle="Top events by likes" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {SocietyData.gallery.slice(0, 6).map((item) => (
          <Card key={item.id} style={{ marginRight: spacing.sm, width: 150 }}>
            <Text style={{ fontSize: 28 }}>{item.icon}</Text>
            <Text style={{ fontWeight: "700", color: colors.text }}>{item.title}</Text>
            <Text style={{ color: colors.textMuted }}>{item.likes.length} likes</Text>
          </Card>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
        {filters.map((item) => (
          <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {events.map((item) => (
          <Card key={item.id}>
            <LinearGradient colors={[...item.gradient] as [string, string]} style={{ borderRadius: radius.md, padding: spacing.lg, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 40 }}>{item.icon}</Text>
              <Text style={{ color: "#fff", fontWeight: "700", marginTop: 8 }}>{item.title}</Text>
            </LinearGradient>
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{item.likes.length} likes</Text>
              <Text style={{ color: colors.textSecondary }}>{item.caption}</Text>
              <Text style={{ color: colors.textMuted }}>{timeAgo(item.date)}</Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};
