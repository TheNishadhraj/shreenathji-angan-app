import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { GlassCard } from "../components/GlassCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { Chip } from "../components/Chip";
import { Badge } from "../components/Badge";
import { spacing, typography, radius, palette } from "../theme/tokens";
import { formatDate } from "../utils/format";
import { getPolls, setPolls } from "../utils/storage";

const filters = ["Active", "Closed", "All"];
const committeeRoles = ["President", "Vice President", "Secretary", "Treasurer", "Committee Member", "Admin"];

type PollsScreenProps = { currentRole: string; userEmail: string };

export const PollsScreen: React.FC<PollsScreenProps> = ({ currentRole, userEmail }) => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState("Active");
  const [polls, setPollsState] = useState<any[]>([]);
  const isCommittee = committeeRoles.includes(currentRole);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await getPolls();
        setPollsState(stored ?? SocietyData.polls);
      };
      load();
    }, [])
  );

  const visible = polls.filter((p) => filter === "All" || p.status === filter);

  const hasVoted = (poll: any) => {
    return poll.options.some((opt: any) => opt.votes.includes(userEmail));
  };

  const vote = (pollId: number, optionText: string) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    if (hasVoted(poll)) {
      Alert.alert("Already Voted", "You have already voted on this poll.");
      return;
    }

    Alert.alert("Confirm Vote", `Submit your vote for "${optionText}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Vote",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          const updated = polls.map((p) => {
            if (p.id !== pollId) return p;
            return {
              ...p,
              options: p.options.map((opt: any) =>
                opt.text === optionText ? { ...opt, votes: [...opt.votes, userEmail] } : opt
              ),
            };
          });
          setPollsState(updated);
          await setPolls(updated);
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
        <ScreenHeader title="Polls" showBack />
        <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, marginTop: -spacing.sm }}>Your voice matters</Text>

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
            const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + opt.votes.length, 0);
            const voted = hasVoted(poll);

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
                  {voted ? <Badge label="✓ Voted" tone="success" /> : null}
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
                  {poll.options.map((opt: any) => {
                    const percentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                    const isMyVote = opt.votes.includes(userEmail);
                    return (
                      <Pressable
                        key={opt.text}
                        onPress={() => !locked && poll.status === "Active" && !voted && vote(poll.id, opt.text)}
                        style={{
                          borderRadius: radius.md,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: isMyVote ? palette.primary : colors.cardBorder,
                          backgroundColor: colors.overlay,
                          opacity: (locked || poll.status !== "Active") ? 0.6 : 1,
                        }}
                      >
                        <View style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentage}%` as any,
                          backgroundColor: isMyVote ? `${palette.primary}25` : `${palette.primary}15`,
                          borderRadius: radius.md,
                        }} />
                        <View style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          padding: spacing.sm + 2,
                        }}>
                          <Text style={{ ...typography.caption, color: colors.text }}>
                            {isMyVote ? "✓ " : ""}{opt.text}
                          </Text>
                          <Text style={{ ...typography.small, color: palette.primary }}>
                            {opt.votes.length} ({percentage.toFixed(0)}%)
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: spacing.sm }}>
                  Total votes: {totalVotes}
                </Text>
              </GlassCard>
            );
          })}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};
