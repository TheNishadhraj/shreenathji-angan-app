import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import { Chip } from "../components/Chip";
import { spacing, radius, palette, shadows, typography } from "../theme/tokens";
import { formatDate, timeAgo } from "../utils/format";
import {
  getEvents,
  setEvents,
  getProfilePhotos,
  uploadEventImage,
  deleteEvent,
  getRegisteredUsers,
} from "../utils/storage";
import { sanitizeText, MAX_LENGTHS } from "../utils/security";

const POST_CATEGORIES = ["Community", "Festivals", "National", "Sports", "Health", "Others"];
const FILTERS = ["All", "Festivals", "National", "Sports", "Health", "Community", "Others"];
const REACT_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🙏"];

// ── Build verified directory email set + dynamic user map ─────────
type UserMapEntry = { name: string; id: number; email: string; flat: string; role: string; phone: string };
const buildUserMap = (): Record<string, UserMapEntry> => {
  const map: Record<string, UserMapEntry> = {};
  SocietyData.users.forEach((u) => {
    map[u.email.toLowerCase()] = { name: u.name, id: u.id, email: u.email, flat: u.flat, role: u.role, phone: u.phone };
  });
  SocietyData.committee.forEach((c) => {
    if (!map[c.email.toLowerCase()]) {
      map[c.email.toLowerCase()] = { name: c.name, id: c.id, email: c.email, flat: "", role: c.position, phone: c.phone };
    }
  });
  return map;
};
const staticUserMap = buildUserMap();
const staticDirectorySet = new Set(SocietyData.users.map((u) => u.email.toLowerCase()));

const getAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&color=fff&bold=true&format=png`;

type EventsScreenProps = {
  userEmail: string;
  userName: string;
  role?: string;
};

const ADMIN_ROLES = ["Admin", "President", "Secretary", "VP", "Treasurer"];

export const EventsScreen: React.FC<EventsScreenProps> = ({ userEmail, userName, role }) => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const isAdmin = ADMIN_ROLES.includes(role ?? "");

  const [filter, setFilter] = useState("All");
  const [events, setEventsState] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [dynamicUserMap, setDynamicUserMap] = useState<Record<string, UserMapEntry>>(staticUserMap);
  const [directorySet, setDirectorySet] = useState<Set<string>>(staticDirectorySet);

  // Create post state
  const [postText, setPostText] = useState("");
  const [postCategory, setPostCategory] = useState("Community");
  const [postImageUri, setPostImageUri] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [posting, setPosting] = useState(false);

  // Interaction state
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [expandedCaption, setExpandedCaption] = useState<Record<number, boolean>>({});
  const [showReactPicker, setShowReactPicker] = useState<string | null>(null);

  // Track viewed posts per session
  const viewedRef = useRef(new Set<number>());

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const [stored, storedPhotos, registeredUsers] = await Promise.all([
          getEvents(),
          getProfilePhotos(),
          getRegisteredUsers(),
        ]);
        setEventsState(stored ?? SocietyData.gallery);
        setPhotos(storedPhotos);

        // Merge registered users so profile name updates are immediately visible
        if (registeredUsers.length > 0) {
          const merged: Record<string, UserMapEntry> = { ...staticUserMap };
          registeredUsers.forEach((u: any) => {
            if (u.email) {
              merged[u.email.toLowerCase()] = {
                name: u.name,
                id: u.id ?? 0,
                email: u.email,
                flat: u.flat ?? "",
                role: u.role ?? "Resident",
                phone: u.phone ?? "",
              };
            }
          });
          setDynamicUserMap(merged);
          setDirectorySet(new Set([
            ...staticDirectorySet,
            ...registeredUsers.map((u: any) => u.email?.toLowerCase() ?? ""),
          ]));
        }
      };
      load();
    }, [])
  );

  const filtered = useMemo(() => {
    return events.filter((item) => filter === "All" || item.category === filter);
  }, [filter, events]);

  // Increment views once per session for each newly visible post
  const filteredKey = filtered.map((f) => f.id).join(",");
  useEffect(() => {
    if (!filtered.length) return;
    const toView: number[] = [];
    filtered.forEach((item) => {
      if (!viewedRef.current.has(item.id)) {
        viewedRef.current.add(item.id);
        toView.push(item.id);
      }
    });
    if (!toView.length) return;
    const updatedViews = events.map((e) =>
      toView.includes(e.id) ? { ...e, views: (e.views ?? 0) + 1 } : e
    );
    setEventsState(updatedViews);
    setEvents(updatedViews).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredKey]);

  const getUserName = (email: string) =>
    dynamicUserMap[email?.toLowerCase()]?.name || email?.split("@")[0] || "User";

  const getUserAvatar = (email: string) => {
    const stored = photos[email?.toLowerCase()];
    if (stored) return stored;
    return getAvatarUrl(getUserName(email));
  };

  const isVerifiedMember = (email: string) => directorySet.has(email?.toLowerCase() ?? "");

  const persist = async (updated: any[]) => {
    setEventsState(updated);
    await setEvents(updated);
  };

  // ── Like ──────────────────────────────────────────────────────
  const handleLike = async (eventId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = events.map((e) => {
      if (e.id !== eventId) return e;
      const liked = (e.likes ?? []).includes(userEmail);
      return {
        ...e,
        likes: liked
          ? (e.likes ?? []).filter((l: string) => l !== userEmail)
          : [...(e.likes ?? []), userEmail],
      };
    });
    await persist(updated);
  };

  // ── Comment ───────────────────────────────────────────────────
  const handleComment = async (eventId: number) => {
    const text = sanitizeText(commentTexts[eventId] ?? "", MAX_LENGTHS.comment);
    if (!text) return;
    const updated = events.map((e) => {
      if (e.id !== eventId) return e;
      return {
        ...e,
        comments: [
          ...(e.comments ?? []),
          {
            id: Date.now(),
            user: userEmail,
            text,
            time: new Date().toISOString(),
            likes: [],
            reacts: {},
          },
        ],
      };
    });
    setCommentTexts((prev) => ({ ...prev, [eventId]: "" }));
    await persist(updated);
  };

  // ── Comment Like ──────────────────────────────────────────────
  const handleCommentLike = async (eventId: number, commentId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = events.map((e) => {
      if (e.id !== eventId) return e;
      return {
        ...e,
        comments: (e.comments ?? []).map((c: any) => {
          if (c.id !== commentId) return c;
          const liked = (c.likes ?? []).includes(userEmail);
          return {
            ...c,
            likes: liked
              ? (c.likes ?? []).filter((l: string) => l !== userEmail)
              : [...(c.likes ?? []), userEmail],
          };
        }),
      };
    });
    await persist(updated);
  };

  // ── Comment React ─────────────────────────────────────────────
  const handleCommentReact = async (eventId: number, commentId: number, emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const updated = events.map((e) => {
      if (e.id !== eventId) return e;
      return {
        ...e,
        comments: (e.comments ?? []).map((c: any) => {
          if (c.id !== commentId) return c;
          const reacts: Record<string, string[]> = { ...(c.reacts ?? {}) };
          const prev = reacts[emoji] ?? [];
          if (prev.includes(userEmail)) {
            reacts[emoji] = prev.filter((u: string) => u !== userEmail);
            if (reacts[emoji].length === 0) delete reacts[emoji];
          } else {
            reacts[emoji] = [...prev, userEmail];
          }
          return { ...c, reacts };
        }),
      };
    });
    setShowReactPicker(null);
    await persist(updated);
  };

  // ── Photo Pick ────────────────────────────────────────────────
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to share photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPostImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  // ── Create Post ───────────────────────────────────────────────
  const handlePost = async () => {
    const text = sanitizeText(postText, MAX_LENGTHS.postText);
    if (!text && !postImageUri) {
      Alert.alert("Empty Post", "Write something or pick a photo to share.");
      return;
    }
    setPosting(true);
    try {
      const newId = Date.now();
      let resolvedImageUri: string | undefined;
      if (postImageUri) {
        resolvedImageUri = await uploadEventImage(newId, postImageUri);
      }
      const newEvent: any = {
        id: newId,
        title: text.length > 40 ? text.substring(0, 40) + "…" : text || "📷 Photo",
        caption: text,
        date: new Date().toISOString(),
        category: postCategory,
        gradient: ["#667eea", "#764ba2"],
        icon: resolvedImageUri ? "📷" : "📝",
        postedBy: userEmail,
        imageUri: resolvedImageUri,
        likes: [],
        saved: [],
        views: 0,
        comments: [],
      };
      const updated = [newEvent, ...events];
      setPostText("");
      setPostImageUri(null);
      setPostCategory("Community");
      await persist(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setPosting(false);
    }
  };

  // ── Delete Post ───────────────────────────────────────────────
  const handleDeletePost = async (eventId: number) => {
    const updated = events.filter((e) => e.id !== eventId);
    setEventsState(updated);
    try {
      await Promise.all([setEvents(updated), deleteEvent(eventId)]);
    } catch {}
  };

  // ── Share ─────────────────────────────────────────────────────
  const handleShare = async (item: any) => {
    try {
      const msg = [
        item.caption,
        `📅 ${formatDate(item.date)} · ${item.category}`,
        `👤 Posted by ${getUserName(item.postedBy)}`,
        "",
        "— Shreenathji Angan Community App",
      ]
        .filter(Boolean)
        .join("\n");
      await Share.share(
        {
          title: item.title,
          message: msg,
          ...(Platform.OS === "ios" && item.imageUri ? { url: item.imageUri } : {}),
        },
        { dialogTitle: "Share Post" }
      );
    } catch {}
  };

  // ── Three-dot Menu ────────────────────────────────────────────
  const handlePostOptions = (item: any) => {
    const isOwn = item.postedBy?.toLowerCase() === userEmail.toLowerCase();
    const canDelete = isOwn || isAdmin;
    const options: string[] = [];
    if (canDelete) options.push("🗑️  Delete Post");
    options.push("🔗  Share Post");
    if (!isOwn) options.push("🚩  Report Post");
    options.push("Cancel");

    const doAction = (idx: number) => {
      let offset = 0;
      if (canDelete) {
        if (idx === offset) {
          Alert.alert("Delete Post", "Remove this post permanently?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => handleDeletePost(item.id) },
          ]);
          return;
        }
        offset++;
      }
      if (idx === offset) {
        handleShare(item);
        return;
      }
      offset++;
      if (!isOwn && idx === offset) {
        Alert.alert("Reported", "This post has been reported to the committee. Thank you.");
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: canDelete ? 0 : undefined,
        },
        doAction
      );
    } else {
      const buttons: any[] = options
        .filter((o) => !o.includes("Cancel"))
        .map((o, i) => ({
          text: o,
          style: o.includes("Delete") ? ("destructive" as const) : ("default" as const),
          onPress: () => doAction(i),
        }));
      buttons.push({ text: "Cancel", style: "cancel" as const });
      Alert.alert("Post Options", undefined, buttons);
    }
  };

  // ── Navigate to member profile ────────────────────────────────
  const navigateToProfile = (posterEmail: string) => {
    const u = dynamicUserMap[posterEmail?.toLowerCase()];
    if (!u) return;
    navigation.navigate("MemberProfile", {
      member: { id: u.id, name: u.name, email: u.email, flat: u.flat, role: u.role, phone: u.phone },
    });
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: spacing.xxl + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: spacing.lg }}>
          <ScreenHeader title="Community Feed" />
        </View>

        {/* ── Create Post Card ── */}
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginBottom: spacing.md,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            ...shadows.soft,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", padding: spacing.md, gap: spacing.sm }}>
            <Image
              source={{ uri: getUserAvatar(userEmail) }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border }}
            />
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder="What do you want to share?"
                placeholderTextColor={colors.textMuted}
                value={postText}
                onChangeText={setPostText}
                maxLength={MAX_LENGTHS.postText}
                style={{ color: colors.text, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 40 }}
                multiline
              />

              {/* Photo preview */}
              {postImageUri ? (
                <View style={{ marginTop: spacing.sm, position: "relative" }}>
                  <Image
                    source={{ uri: postImageUri }}
                    style={{ width: "100%", height: 180, borderRadius: radius.md }}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setPostImageUri(null)}
                    hitSlop={6}
                    style={{
                      position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
                      backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ) : null}

              {/* Category selector badge */}
              <Pressable
                onPress={() => setShowCategoryPicker((p) => !p)}
                style={{
                  marginTop: spacing.xs, flexDirection: "row", alignItems: "center", gap: 4,
                  alignSelf: "flex-start", backgroundColor: `${colors.primary}22`,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
                }}
              >
                <Ionicons name="pricetag-outline" size={12} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>{postCategory}</Text>
                <Ionicons name={showCategoryPicker ? "chevron-up" : "chevron-down"} size={12} color={colors.primary} />
              </Pressable>

              {showCategoryPicker ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.xs }}>
                  {POST_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => { setPostCategory(cat); setShowCategoryPicker(false); }}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
                        backgroundColor: postCategory === cat ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: postCategory === cat ? "#fff" : colors.text }}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* Action strip */}
          <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable
              onPress={handlePickImage}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm + 2, gap: 6 }}
            >
              <Ionicons name="image-outline" size={18} color={palette.success} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: palette.success }}>Photo</Text>
            </Pressable>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <Pressable
              onPress={() => setShowCategoryPicker((p) => !p)}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm + 2, gap: 6 }}
            >
              <Ionicons name="pricetag-outline" size={18} color={palette.info} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: palette.info }}>Type</Text>
            </Pressable>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <Pressable
              onPress={handlePost}
              disabled={posting}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm + 2, gap: 6, opacity: posting ? 0.5 : 1 }}
            >
              <Ionicons name="send-outline" size={18} color={palette.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: palette.primary }}>{posting ? "Posting…" : "Post"}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Category Filters ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingLeft: spacing.lg, marginBottom: spacing.md }}
          contentContainerStyle={{ paddingRight: spacing.lg, gap: spacing.sm }}
        >
          {FILTERS.map((item) => (
            <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
          ))}
        </ScrollView>

        {/* ── Feed ── */}
        <View style={{ gap: spacing.md }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xxl * 2 }}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
                No posts in this category yet
              </Text>
            </View>
          ) : null}

          {filtered.map((item) => {
            const posterName = getUserName(item.postedBy);
            const posterAvatar = getUserAvatar(item.postedBy);
            const liked = (item.likes ?? []).includes(userEmail);
            const captionLong = (item.caption ?? "").length > 120;
            const showFullCaption = expandedCaption[item.id];
            const showComments = expandedComments[item.id];
            const isVerified = isVerifiedMember(item.postedBy);

            return (
              <View
                key={item.id}
                style={{
                  marginHorizontal: spacing.lg,
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  overflow: "hidden",
                  ...shadows.soft,
                }}
              >
                {/* ── Post Header ── */}
                <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm }}>
                  <Pressable onPress={() => navigateToProfile(item.postedBy)}>
                    <Image
                      source={{ uri: posterAvatar }}
                      style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border }}
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Pressable onPress={() => navigateToProfile(item.postedBy)}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{posterName}</Text>
                        {isVerified ? <Ionicons name="checkmark-circle" size={15} color={palette.primary} /> : null}
                      </View>
                    </Pressable>
                    <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 1 }}>
                      {timeAgo(item.date)} · {formatDate(item.date)} · {item.category}
                    </Text>
                  </View>
                  {/* Three-dot always visible for all users */}
                  <Pressable
                    onPress={() => handlePostOptions(item)}
                    hitSlop={10}
                    style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* ── Caption ── */}
                {item.caption ? (
                  <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" }}>
                      {captionLong && !showFullCaption ? item.caption.substring(0, 120) + "…" : item.caption}
                    </Text>
                    {captionLong ? (
                      <Pressable onPress={() => setExpandedCaption((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}>
                        <Text style={{ color: palette.primary, fontSize: 13, fontWeight: "600", marginTop: 2 }}>
                          {showFullCaption ? "Show less" : "…more"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {/* ── Media: image covers full width ─OR─ gradient banner ── */}
                {item.imageUri ? (
                  <Image
                    source={{ uri: item.imageUri }}
                    style={{ width: "100%", aspectRatio: 1 }}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={(item.gradient ?? ["#667eea", "#764ba2"]) as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ height: 200, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 56 }}>{item.icon}</Text>
                    <Text
                      style={{
                        color: "#fff", fontWeight: "700", fontSize: 16, marginTop: spacing.sm,
                        paddingHorizontal: spacing.lg, textAlign: "center",
                      }}
                    >
                      {item.title}
                    </Text>
                  </LinearGradient>
                )}

                {/* ── Engagement Counts ── */}
                <View
                  style={{
                    flexDirection: "row", justifyContent: "space-between",
                    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
                    borderBottomWidth: 1, borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ ...typography.tiny, color: colors.textMuted }}>
                    {(item.likes ?? []).length > 0
                      ? `${(item.likes ?? []).length} like${(item.likes ?? []).length > 1 ? "s" : ""}`
                      : ""}
                  </Text>
                  <Text style={{ ...typography.tiny, color: colors.textMuted }}>
                    {(item.comments ?? []).length > 0
                      ? `${(item.comments ?? []).length} comment${(item.comments ?? []).length > 1 ? "s" : ""}`
                      : ""}
                    {(item.views ?? 0) > 0 ? `  ·  ${item.views} view${item.views > 1 ? "s" : ""}` : ""}
                  </Text>
                </View>

                {/* ── Action Buttons ── */}
                <View style={{ flexDirection: "row" }}>
                  <Pressable
                    onPress={() => handleLike(item.id)}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm + 2, gap: 6 }}
                  >
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? palette.danger : colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: liked ? palette.danger : colors.textSecondary }}>Like</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setExpandedComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm + 2, gap: 6 }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>Comment</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleShare(item)}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm + 2, gap: 6 }}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>Share</Text>
                  </Pressable>
                </View>

                {/* ── Comments Section ── */}
                {showComments ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md }}>
                    {(item.comments ?? []).map((comment: any) => {
                      const commentLiked = (comment.likes ?? []).includes(userEmail);
                      const reactKey = `${item.id}-${comment.id}`;
                      const totalReacts = Object.values(comment.reacts ?? {}).reduce(
                        (sum: number, users: any) => sum + (users as string[]).length, 0
                      ) as number;
                      const myReact = Object.keys(comment.reacts ?? {}).find((emoji) =>
                        ((comment.reacts ?? {})[emoji] ?? []).includes(userEmail)
                      );

                      return (
                        <View key={comment.id} style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
                          <Pressable onPress={() => navigateToProfile(comment.user)}>
                            <Image
                              source={{ uri: getUserAvatar(comment.user) }}
                              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border }}
                            />
                          </Pressable>
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                                borderRadius: radius.md,
                                padding: spacing.sm,
                              }}
                            >
                              <Pressable onPress={() => navigateToProfile(comment.user)}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                  <Text style={{ fontWeight: "700", color: colors.text, fontSize: 13 }}>
                                    {getUserName(comment.user)}
                                  </Text>
                                  {isVerifiedMember(comment.user) ? (
                                    <Ionicons name="checkmark-circle" size={12} color={palette.primary} />
                                  ) : null}
                                </View>
                              </Pressable>
                              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{comment.text}</Text>
                            </View>

                            {/* Like + React row */}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: 4, paddingHorizontal: 4, flexWrap: "wrap" }}>
                              <Text style={{ ...typography.tiny, color: colors.textMuted }}>{timeAgo(comment.time)}</Text>

                              {/* Comment Like */}
                              <Pressable
                                onPress={() => handleCommentLike(item.id, comment.id)}
                                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                              >
                                <Ionicons
                                  name={commentLiked ? "heart" : "heart-outline"}
                                  size={13}
                                  color={commentLiked ? palette.danger : colors.textMuted}
                                />
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                  {(comment.likes ?? []).length > 0 ? (comment.likes ?? []).length : "Like"}
                                </Text>
                              </Pressable>

                              {/* Comment React toggle */}
                              <Pressable
                                onPress={() => setShowReactPicker((prev) => (prev === reactKey ? null : reactKey))}
                                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                              >
                                <Text style={{ fontSize: 13 }}>{myReact ?? "😊"}</Text>
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                  {totalReacts > 0 ? totalReacts : "React"}
                                </Text>
                              </Pressable>
                            </View>

                            {/* Emoji picker popover */}
                            {showReactPicker === reactKey ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  backgroundColor: colors.card,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                  borderRadius: radius.full,
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  gap: 6,
                                  marginTop: 4,
                                  alignSelf: "flex-start",
                                  ...shadows.soft,
                                }}
                              >
                                {REACT_EMOJIS.map((emoji) => (
                                  <Pressable
                                    key={emoji}
                                    onPress={() => handleCommentReact(item.id, comment.id, emoji)}
                                    style={{ padding: 3 }}
                                  >
                                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}

                            {/* Reaction summary bubbles */}
                            {Object.keys(comment.reacts ?? {}).length > 0 ? (
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2, paddingHorizontal: 4 }}>
                                {Object.entries(comment.reacts as Record<string, string[]>)
                                  .filter(([, users]) => users.length > 0)
                                  .map(([emoji, users]) => (
                                    <View
                                      key={emoji}
                                      style={{
                                        flexDirection: "row", alignItems: "center",
                                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                                        borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2, gap: 2,
                                      }}
                                    >
                                      <Text style={{ fontSize: 12 }}>{emoji}</Text>
                                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{users.length}</Text>
                                    </View>
                                  ))}
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}

                    {/* Add Comment */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
                      <Image
                        source={{ uri: getUserAvatar(userEmail) }}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border }}
                      />
                      <TextInput
                        placeholder="Write a comment…"
                        placeholderTextColor={colors.textMuted}
                        value={commentTexts[item.id] || ""}
                        onChangeText={(t) => setCommentTexts((prev) => ({ ...prev, [item.id]: t }))}
                        maxLength={MAX_LENGTHS.comment}
                        style={{
                          flex: 1,
                          backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
                          borderRadius: radius.full,
                          paddingHorizontal: spacing.md,
                          paddingVertical: 8,
                          color: colors.text,
                          fontSize: 13,
                        }}
                        returnKeyType="send"
                        onSubmitEditing={() => handleComment(item.id)}
                      />
                      <Pressable onPress={() => handleComment(item.id)} hitSlop={8}>
                        <Ionicons name="send" size={20} color={palette.primary} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
