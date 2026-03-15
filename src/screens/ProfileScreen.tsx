import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Image,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { SectionHeader } from "../components/SectionHeader";
import { Card } from "../components/Card";
import { spacing, radius, shadows, typography, avatarGradients } from "../theme/tokens";
import { SocietyData } from "../data/societyData";
import {
  getRegisteredUsers,
  setRegisteredUsers,
  getPasswordOverrides,
  setPasswordOverrides,
  getProfilePhotos,
  setProfilePhoto,
  getProfileBios,
  setProfileBio,
} from "../utils/storage";

type ProfileScreenProps = {
  user: {
    id?: string;
    name: string;
    email: string;
    flat: string;
    role: string;
    phone: string;
  };
  onUpdate: (user: Partial<ProfileScreenProps["user"]>) => void;
  onLogout: () => void;
};

type TabKey = "posts" | "videos" | "likes" | "saved";

const TABS: { key: TabKey; icon: string }[] = [
  { key: "posts", icon: "▦" },
  { key: "videos", icon: "▶" },
  { key: "likes", icon: "♥" },
  { key: "saved", icon: "⊡" },
];

// Placeholder gallery images
const placeholderGallery = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  uri: `https://picsum.photos/seed/sa_${i}/400/400`,
}));

const screenW = Dimensions.get("window").width;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onUpdate, onLogout }) => {
  const { colors, toggle, mode, isDark } = useTheme();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [bio, setBio] = useState("Proud resident of Shreenathji Angan 🏡");
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const photoKey = user.email.toLowerCase();
  const bioKey = user.id || user.email;

  useEffect(() => {
    getProfilePhotos().then((photos) => {
      if (photos[photoKey]) setPhotoUri(photos[photoKey]);
    });
    getProfileBios().then((bios) => {
      if (bios[bioKey]) setBio(bios[bioKey]);
    });
  }, [photoKey, bioKey]);

  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=400&background=random&color=fff&bold=true&format=png`;

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to update your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await setProfilePhoto(photoKey, uri);
    }
  }, [photoKey]);

  const handleSaveBio = async () => {
    setBio(bioInput);
    setEditingBio(false);
    await setProfileBio(bioKey, bioInput);
  };

  const handleSave = async () => {
    onUpdate({ name, phone });
    // Also persist to registered users if applicable
    const registered = await getRegisteredUsers();
    const idx = registered.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      registered[idx].name = name;
      registered[idx].phone = phone;
      await setRegisteredUsers(registered);
    }
    setShowSettings(false);
    Alert.alert("Saved", "Profile updated.");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Invalid", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirm password do not match.");
      return;
    }
    const overrides = await getPasswordOverrides();
    const allUsers = [...SocietyData.users, ...(await getRegisteredUsers())];
    const existing = allUsers.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
    const expected = overrides[user.email.toLowerCase()] || existing?.password || "";
    if (expected !== currentPassword) {
      Alert.alert("Invalid", "Current password is incorrect.");
      return;
    }
    overrides[user.email.toLowerCase()] = newPassword;
    await setPasswordOverrides(overrides);
    const registered = await getRegisteredUsers();
    const idx = registered.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      registered[idx].password = newPassword;
      await setRegisteredUsers(registered);
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Success", "Password updated.");
  };

  const handleBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert("Unavailable", "Biometric hardware not available.");
      return;
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Alert.alert("Not Enrolled", "Please enroll Face ID / fingerprint on this device.");
      return;
    }
    await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Shreenathji Angan" });
  };

  const PHOTO_SIZE = 110;
  const gridGap = 2;
  const gridItemSize = (screenW - spacing.lg * 2 - gridGap * 2) / 3;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
    >
      {/* ── Cover / Header Area ── */}
      <LinearGradient
        colors={isDark ? ["#1A1A2E", "#0C0C14"] : ["#E8DDD5", "#D4C5B5"]}
        style={{
          height: 160,
          width: "100%",
        }}
      />

      {/* ── Profile Photo ── */}
      <View style={{ alignItems: "center", marginTop: -(PHOTO_SIZE / 2) }}>
        <Pressable onPress={pickPhoto}>
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
          {/* Edit icon */}
          <View
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: colors.background,
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 14 }}>✎</Text>
          </View>
        </Pressable>
      </View>

      {/* ── Name & Bio ── */}
      <View style={{ alignItems: "center", paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <Text
          style={{
            ...typography.h2,
            color: colors.text,
            textAlign: "center",
          }}
        >
          {user.name}
        </Text>

        {editingBio ? (
          <View style={{ width: "100%", marginTop: spacing.sm }}>
            <TextInput
              value={bioInput}
              onChangeText={setBioInput}
              placeholder="Write your bio..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={120}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                color: colors.text,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                textAlign: "center",
                minHeight: 50,
              }}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, justifyContent: "center" }}>
              <Pressable
                onPress={handleSaveBio}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                }}
              >
                <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditingBio(false)}
                style={{
                  backgroundColor: colors.card,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setBioInput(bio);
              setEditingBio(true);
            }}
          >
            <Text
              style={{
                ...typography.caption,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: spacing.xs,
              }}
            >
              {bio}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 2 }}>
              Tap to edit bio
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Stats Row: Flat | Role | Phone ── */}
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
          <Text style={{ ...typography.h3, color: colors.text }}>{user.flat}</Text>
          <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 2 }}>House No.</Text>
        </View>
        <View style={{ width: 0.5, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: user.role.length > 10 ? 13 : 16,
              color: colors.text,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {user.role}
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
            {user.phone?.replace("+91 ", "") || "—"}
          </Text>
          <Text style={{ ...typography.tiny, color: colors.textMuted, marginTop: 2 }}>Mobile</Text>
        </View>
      </View>

      {/* ── Action Buttons: Settings | Theme | Logout ── */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => setShowSettings(true)}
          style={{
            flex: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            paddingVertical: 10,
            borderRadius: radius.full,
            alignItems: "center",
          }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.text }}>Settings</Text>
        </Pressable>
        <Pressable
          onPress={toggle}
          style={{
            flex: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            paddingVertical: 10,
            borderRadius: radius.full,
            alignItems: "center",
          }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.text }}>
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onLogout}
          style={{
            flex: 1,
            backgroundColor: `${colors.danger}18`,
            paddingVertical: 10,
            borderRadius: radius.full,
            alignItems: "center",
          }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.danger }}>Logout</Text>
        </Pressable>
      </View>

      {/* ── Content Tabs ── */}
      <View
        style={{
          flexDirection: "row",
          marginTop: spacing.lg,
          borderBottomWidth: 0.5,
          borderColor: colors.border,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.text : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  opacity: isActive ? 1 : 0.35,
                }}
              >
                {tab.icon}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Photo Grid ── */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: spacing.lg,
          paddingTop: gridGap,
          gap: gridGap,
        }}
      >
        {activeTab === "posts" &&
          placeholderGallery.map((img) => (
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
        {activeTab === "videos" && (
          <View style={{ flex: 1, alignItems: "center", paddingVertical: spacing.xxl }}>
            <Text style={{ fontSize: 40 }}>🎬</Text>
            <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
              No videos yet
            </Text>
          </View>
        )}
        {activeTab === "likes" && (
          <View style={{ flex: 1, alignItems: "center", paddingVertical: spacing.xxl }}>
            <Text style={{ fontSize: 40 }}>❤️</Text>
            <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
              No liked posts yet
            </Text>
          </View>
        )}
        {activeTab === "saved" && (
          <View style={{ flex: 1, alignItems: "center", paddingVertical: spacing.xxl }}>
            <Text style={{ fontSize: 40 }}>🔖</Text>
            <Text style={{ ...typography.caption, color: colors.textMuted, marginTop: spacing.sm }}>
              No saved posts yet
            </Text>
          </View>
        )}
      </View>

      {/* ── Settings Modal ── */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
            <Text style={{ ...typography.h2, color: colors.text }}>Settings</Text>
            <Pressable onPress={() => setShowSettings(false)}>
              <Text style={{ fontSize: 24, color: colors.textMuted }}>✕</Text>
            </Pressable>
          </View>

          <SectionHeader title="Personal Information" />
          <Card>
            <TextInput
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                fontFamily: "Inter_400Regular",
              }}
            />
            <TextInput
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                fontFamily: "Inter_400Regular",
              }}
            />
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: radius.md,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Save</Text>
            </Pressable>
          </Card>

          <SectionHeader title="Security" />
          <Card>
            <Pressable
              onPress={handleBiometric}
              style={{
                padding: 12,
                borderRadius: radius.md,
                backgroundColor: `${colors.info}22`,
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ color: colors.info, fontFamily: "Inter_600SemiBold" }}>Enable Biometrics</Text>
            </Pressable>
          </Card>

          <SectionHeader title="Change Password" />
          <Card>
            <TextInput
              placeholder="Current Password"
              placeholderTextColor={colors.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                fontFamily: "Inter_400Regular",
              }}
            />
            <TextInput
              placeholder="New Password"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                fontFamily: "Inter_400Regular",
              }}
            />
            <TextInput
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: 12,
                marginBottom: spacing.sm,
                color: colors.text,
                fontFamily: "Inter_400Regular",
              }}
            />
            <Pressable
              onPress={handleChangePassword}
              style={{
                backgroundColor: colors.secondary,
                padding: 12,
                borderRadius: radius.md,
                alignItems: "center",
              }}
            >
              <Text style={{ color: isDark ? "#000" : "#fff", fontFamily: "Inter_600SemiBold" }}>
                Update Password
              </Text>
            </Pressable>
          </Card>

          <Pressable
            onPress={onLogout}
            style={{
              marginTop: spacing.lg,
              backgroundColor: colors.danger,
              padding: 14,
              borderRadius: radius.md,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Logout</Text>
          </Pressable>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </Modal>
    </ScrollView>
  );
};
