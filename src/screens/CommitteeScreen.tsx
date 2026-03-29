import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { SocietyData } from "../data/societyData";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  spacing,
  radius,
  shadows,
  avatarGradients,
} from "../theme/tokens";
import { getProfilePhotos, setProfilePhoto } from "../utils/storage";

// ── Sort: President → VP → Secretary → Treasurer → Members ──
const ROLE_ORDER: Record<string, number> = {
  President: 0,
  "Vice President": 1,
  Secretary: 2,
  Treasurer: 3,
};

const sortedCommittee = [...SocietyData.committee].sort((a, b) => {
  const oa = ROLE_ORDER[a.position] ?? 99;
  const ob = ROLE_ORDER[b.position] ?? 99;
  return oa - ob;
});

// ── Deterministic placeholder avatars ──
const samplePhotos: Record<number, string> = {};
sortedCommittee.forEach((m) => {
  const encoded = encodeURIComponent(m.name);
  samplePhotos[m.id] =
    `https://ui-avatars.com/api/?name=${encoded}&size=400&background=random&color=fff&bold=true&format=png`;
});

// ── Bento layout helpers ──
const GAP = spacing.sm;
const SCREEN_PAD = spacing.lg;

const getCardWidth = (screenW: number) =>
  (screenW - SCREEN_PAD * 2 - GAP) / 2;

type BentoSize = "tall" | "normal";

const getBentoSize = (index: number): BentoSize => {
  if (index < 4) return index % 2 === 0 ? "tall" : "normal";
  return index % 3 === 0 ? "tall" : "normal";
};

export const CommitteeScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const screenW = Dimensions.get("window").width;
  const cardW = getCardWidth(screenW);

  useFocusEffect(
    useCallback(() => {
      getProfilePhotos().then(setPhotos).catch(() => {});
    }, [])
  );

  const pickPhoto = useCallback(
    async (memberId: number) => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to update profile pictures.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const member = sortedCommittee.find((m) => m.id === memberId);
        const key = member?.email?.toLowerCase() || String(memberId);
        await setProfilePhoto(key, uri);
        setPhotos((prev) => ({ ...prev, [key]: uri }));
      }
    },
    []
  );

  const getPhotoUri = (member: (typeof sortedCommittee)[0]) =>
    photos[member.email?.toLowerCase()] || samplePhotos[member.id];

  // Split into two columns for bento masonry
  const leftCol: { member: (typeof sortedCommittee)[0]; idx: number }[] = [];
  const rightCol: { member: (typeof sortedCommittee)[0]; idx: number }[] = [];
  sortedCommittee.forEach((member, idx) => {
    if (idx % 2 === 0) leftCol.push({ member, idx });
    else rightCol.push({ member, idx });
  });

  const renderCard = (
    member: (typeof sortedCommittee)[0],
    idx: number
  ) => {
    const size = getBentoSize(idx);
    const height = size === "tall" ? cardW * 1.5 : cardW * 1.1;
    const isLeadership = (ROLE_ORDER[member.position] ?? 99) < 4;

    return (
      <Pressable
        key={member.id}
        onPress={() => navigation.navigate("MemberProfile", { member })}
        onLongPress={() => pickPhoto(member.id)}
        style={{
          width: cardW,
          height,
          borderRadius: radius.lg,
          overflow: "hidden",
          marginBottom: GAP,
          backgroundColor: colors.cardSolid,
          ...shadows.soft,
        }}
      >
        <Image
          source={{ uri: getPhotoUri(member) }}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
          }}
          resizeMode="cover"
        />
        {/* Dark gradient overlay at bottom */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "55%",
          }}
        />
        {/* Leadership badge */}
        {isLeadership && (
          <View
            style={{
              position: "absolute",
              top: spacing.sm,
              left: spacing.sm,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: spacing.sm,
              paddingVertical: 3,
              borderRadius: radius.full,
            }}
          >
            <Text
              style={{
                color: "#FFF",
                fontSize: 10,
                fontFamily: "Inter_600SemiBold",
                letterSpacing: 0.5,
              }}
            >
              {member.position.toUpperCase()}
            </Text>
          </View>
        )}
        {/* Name & role */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: spacing.sm,
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontFamily: "Poppins_600SemiBold",
              fontSize: 14,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {member.name}
          </Text>
          {!isLeadership && (
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                fontFamily: "Inter_400Regular",
                marginTop: 2,
              }}
            >
              {member.position}
            </Text>
          )}
          <Text
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 10,
              fontFamily: "Inter_400Regular",
              marginTop: 2,
            }}
          >
            Since {member.since}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: SCREEN_PAD,
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing.xxl,
      }}
    >
      <ScreenHeader title="Leadership Team" showBack />
      <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, marginTop: -spacing.sm }}>Long-press any photo to update</Text>

      {/* Bento masonry two-column layout */}
      <View style={{ flexDirection: "row", gap: GAP }}>
        <View style={{ flex: 1 }}>
          {leftCol.map(({ member, idx }) => renderCard(member, idx))}
        </View>
        <View style={{ flex: 1 }}>
          {/* offset right column for masonry feel */}
          <View style={{ height: spacing.xl }} />
          {rightCol.map(({ member, idx }) => renderCard(member, idx))}
        </View>
      </View>
    </ScrollView>
  );
};
