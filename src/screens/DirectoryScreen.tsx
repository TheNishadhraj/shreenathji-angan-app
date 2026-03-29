import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
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
import { Badge } from "../components/Badge";
import { spacing, radius, shadows } from "../theme/tokens";
import { getProfilePhotos, setProfilePhoto } from "../utils/storage";

const GAP = spacing.sm;
const SCREEN_PAD = spacing.lg;
const getCardWidth = (screenW: number) =>
  (screenW - SCREEN_PAD * 2 - GAP) / 2;

type BentoSize = "tall" | "normal";
const getBentoSize = (index: number): BentoSize =>
  index % 3 === 0 ? "tall" : "normal";

// Placeholder avatars
const userPhotos: Record<number, string> = {};
SocietyData.users.forEach((u) => {
  const encoded = encodeURIComponent(u.name);
  userPhotos[u.id] =
    `https://ui-avatars.com/api/?name=${encoded}&size=400&background=random&color=fff&bold=true&format=png`;
});

export const DirectoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const screenW = Dimensions.get("window").width;
  const cardW = getCardWidth(screenW);

  useFocusEffect(
    useCallback(() => {
      getProfilePhotos().then(setPhotos);
    }, [])
  );

  const list = SocietyData.users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.flat.toLowerCase().includes(query.toLowerCase()) ||
      u.block.toLowerCase().includes(query.toLowerCase())
  );

  const pickPhoto = useCallback(async (userId: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to update profile pictures."
      );
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
      const u = SocietyData.users.find((x) => x.id === userId);
      const key = u?.email?.toLowerCase() || `user_${userId}`;
      await setProfilePhoto(key, uri);
      setPhotos((prev) => ({ ...prev, [key]: uri }));
    }
  }, []);

  const getPhotoUri = (user: (typeof list)[0]) =>
    photos[user.email?.toLowerCase()] || userPhotos[user.id];

  // Split into two columns
  const leftCol: { user: (typeof list)[0]; idx: number }[] = [];
  const rightCol: { user: (typeof list)[0]; idx: number }[] = [];
  list.forEach((user, idx) => {
    if (idx % 2 === 0) leftCol.push({ user, idx });
    else rightCol.push({ user, idx });
  });

  const renderCard = (user: (typeof list)[0], idx: number) => {
    const size = getBentoSize(idx);
    const height = size === "tall" ? cardW * 1.5 : cardW * 1.1;

    return (
      <Pressable
        key={user.id}
        onPress={() => navigation.navigate("MemberProfile", { member: user })}
        onLongPress={() => pickPhoto(user.id)}
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
          source={{ uri: getPhotoUri(user) }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          resizeMode="cover"
        />
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
        {/* Flat badge */}
        <View
          style={{
            position: "absolute",
            top: spacing.sm,
            right: spacing.sm,
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
            }}
          >
            {user.flat}
          </Text>
        </View>
        {/* Name and details */}
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
              fontSize: 13,
              lineHeight: 17,
            }}
            numberOfLines={2}
          >
            {user.name}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 10,
              fontFamily: "Inter_400Regular",
              marginTop: 2,
            }}
          >
            Block {user.block} • {user.role}
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
      <ScreenHeader title="Member Directory" showBack />
      <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, marginTop: -spacing.sm }}>Long-press any photo to update</Text>
      <TextInput
        placeholder="Search name, flat, or block"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.inputBg,
          borderRadius: radius.md,
          padding: 12,
          marginBottom: spacing.md,
          color: colors.text,
          fontFamily: "Inter_400Regular",
          fontSize: 14,
        }}
      />

      {/* Bento masonry two-column */}
      <View style={{ flexDirection: "row", gap: GAP }}>
        <View style={{ flex: 1 }}>
          {leftCol.map(({ user, idx }) => renderCard(user, idx))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ height: spacing.xl }} />
          {rightCol.map(({ user, idx }) => renderCard(user, idx))}
        </View>
      </View>
    </ScrollView>
  );
};
