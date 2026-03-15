import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, Alert} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { GlassCard } from "../components/GlassCard";
import { SectionHeader } from "../components/SectionHeader";
import { Chip } from "../components/Chip";
import { Badge } from "../components/Badge";
import { spacing, typography, radius, palette } from "../theme/tokens";
import { formatDate } from "../utils/format";

const filters = ["Active", "Closed", "All"];
const committeeRoles = ["President", "Vice President", "Secretary", "Treasurer", "Committee Member", "Admin"];

type PollsScreenProps = { currentRole: string };

export const PollsScreen: React.FC<PollsScreenProps> = ({ currentRole }) => {
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState("Active");
  const [polls, setPolls] = useState(SocietyData.polls);
  const isCommittee = committeeRoles.includes(currentRole);

  const visible = polls.filter((p) => filter === "All" || p.status === filter);

  const vote = (pollId: number, optionText: string) => {
    Alert.alert("Confirm Vote", "Submit your vote?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Vote",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setPolls((prev) =>
            prev.map((poll) => {
              if (poll.id !== pollId) return poll;
              return {
                ...poll,
                options: poll.options.map((opt) =>
                  opt.text === optionText ? { ...opt, votes: [...opt.votes, "demo@example.com"] } : opt
                ),
              };
            })
          );
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <SectionHeader title="Polls" subtitle="Your voice matters" size="lg" style={{ marginTop: spacing.lg }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {filters.map((item) => (
              <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
            ))}
          </View>
        </ScrollView>

        <View style={{ gap: spacing.md }}>
          {visible.map((poll) => {
            const locked = poll.type === "committee" && !isCommittee;
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

            return (
              <GlassCard key={poll.id} variant="elevated">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm }}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={{ ...typography.bodyBold, color: colors.text }}>{poll.title}</Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                      {poll.description}
                    </Text>
                  </View>
                  <Badge
                    label={poll.status}
                    tone={poll.status === "Active" ? "success" : "accent"}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, alignItems: "center" }}>
                  <Badge label={poll.type.toUpperCase()} tone={poll.type === "committee" ? "danger" : "info"} />
                  <Text style={{ ...typography.tiny, color: colors.textMuted }}>
                    Deadline: {formatDate(poll.deadline)}
                  </Text>
                </View>

                {locked ? (
                  <View style={{
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: `${palette.danger}10`,
                    borderWidth: 1,
                    borderColor: `${palette.danger}20`,
                    marginBottom: spacing.sm,
                  }}>
                    <Text style={{ ...typography.caption, color: palette.danger }}>
                      🔒 Committee members only
                    </Text>
                  </View>
                ) : null}

                <View style={{ gap: spacing.sm }}>
                  {poll.options.map((opt) => {
                    const percentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                    return (
                      <Pressable
                        key={opt.text}
                        onPress={() => !locked && poll.status === "Active" && vote(poll.id, opt.text)}
                        style={{
                          borderRadius: radius.md,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          backgroundColor: colors.overlay,
                        }}
                      >
                        <View style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentage}%`,
                          backgroundColor: `${palette.primary}15`,
                          borderRadius: radius.md,
                        }} />
                        <View style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          padding: spacing.sm + 2,
                        }}>
                          <Text style={{ ...typography.caption, color: colors.text }}>{opt.text}</Text>
                          <Text style={{ ...typography.small, color: palette.primary }}>
                            {opt.votes.length} votes
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>
            );
          })}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};
