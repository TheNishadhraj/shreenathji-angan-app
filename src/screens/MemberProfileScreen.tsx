import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { spacing, radius, shadows, typography } from "../theme/tokens";
import { getProfilePhotos, getProfileBios } from "../utils/storage";

const screenW = Dimensions.get("window").width;

const placeholderGallery = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  uri: `https://picsum.photos/seed/member_${i}/400/400`,
}));

export const MemberProfileScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { member } = route.params;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  const photoKey = member.email?.toLowerCase() || "";
  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=400&background=random&color=fff&bold=true&format=png`;

  useEffect(() => {
    getProfilePhotos().then((photos) => {
      if (photos[photoKey]) setPhotoUri(photos[photoKey]);
    });
    getProfileBios().then((bios) => {
      const key = member.id || member.email;
      if (bios[key]) setBio(bios[key]);
    });
  }, [photoKey]);

  // Determine role/flat/phone from user data or committee data
  const userData = SocietyData.users.find(
    (u) => u.email?.toLowerCase() === member.email?.toLowerCase()
  );
  const committeeData = SocietyData.committee.find(
    (c) => c.email?.toLowerCase() === member.email?.toLowerCase()
  );

  const flat = userData?.flat || member.flat || "—";
  const role = committeeData?.position || userData?.role || member.role || member.position || "Resident";
  const phone = userData?.phone || committeeData?.phone || member.phone || "";
  const responsibility = committeeData?.responsibility || "";
  const since = committeeData?.since || "";

  const PHOTO_SIZE = 110;
  const gridGap = 2;
  const gridItemSize = (screenW - spacing.lg * 2 - gridGap * 2) / 3;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      {/* Cover */}
      <LinearGradient
        colors={isDark ? ["#1A1A2E", "#0C0C14"] : ["#E8DDD5", "#D4C5B5"]}
        style={{ height: 160, width: "100%" }}
      >
        {/* Back button */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            position: "absolute",
            top: insets.top + spacing.sm,
            left: spacing.md,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      </LinearGradient>

      {/* Profile Photo */}
      <View style={{ alignItems: "center", marginTop: -(PHOTO_SIZE / 2) }}>
        <Image
          source={{ uri: photoUri || defaultPhoto }}
          style={{
            width: PHOTO_SIZE,
            height: PHOTO_SIZE,
            borderRadius: PHOTO_SIZE / 2,
            borderWidth: 4,
            borderColor: colors.background,
            ...shadows.soft,
          }}
        />
      </View>

      {/* Name & Bio */}
      <View style={{ alignItems: "center", paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <Text style={{ ...typography.h2, color: colors.text, textAlign: "center" }}>
          {member.name}
        </Text>
        {bio ? (
          <Text style={{ ...typography.caption, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs }}>
            {bio}
          </Text>
        ) : (
          <Text style={{ ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs }}>
            Resident of Shreenathji Angan 🏡
          </Text>
        )}
      </View>

      {/* Stats Row */}
      <View
        style={{
          flexDirection: "row",
          marginTop: spacing.lg,
          marginHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: colors.border,
        }}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ ...typography.h3, color: colors.text }}>{flat}</Text>
          <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 2 }}>House No.</Text>
        </View>
        <View style={{ width: 0.5, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: role.length > 12 ? 11 : role.length > 10 ? 13 : 16,
              color: colors.text,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {role}
          </Text>
          <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 2 }}>Designation</Text>
        </View>
        <View style={{ width: 0.5, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 13,
              color: colors.text,
            }}
            numberOfLines={1}
          >
            {phone?.replace("+91 ", "") || "—"}
          </Text>
          <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 2 }}>Mobile</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => phone && Linking.openURL(`tel:${phone}`)}
          style={{
            flex: 1,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: radius.full,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.xs,
          }}
        >
          <Ionicons name="call-outline" size={16} color="#FFF" />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFF" }}>Call</Text>
        </Pressable>
        <Pressable
          onPress={() => phone && Linking.openURL(`sms:${phone}`)}
          style={{
            flex: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            paddingVertical: 12,
            borderRadius: radius.full,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: spacing.xs,
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.text }}>Message</Text>
        </Pressable>
      </View>

      {/* Responsibility (for committee members) */}
      {responsibility ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.lg,
            padding: spacing.md,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs }}>
            Responsibility
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, lineHeight: 20 }}>
            {responsibility}
          </Text>
          {since ? (
            <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: spacing.sm }}>
              Serving since {since}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Photo Grid */}
      <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
        <Text style={{ ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm }}>
          Photos
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: spacing.lg,
          gap: gridGap,
        }}
      >
        {placeholderGallery.map((img) => (
          <Image
            key={img.id}
            source={{ uri: img.uri }}
            style={{
              width: gridItemSize,
              height: gridItemSize,
              borderRadius: radius.sm,
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
};
