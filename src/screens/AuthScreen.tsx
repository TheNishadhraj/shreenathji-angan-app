import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { SocietyData } from "../data/societyData";
import { setRegisteredUsers, getRegisteredUsers, setSession, getSession, getPasswordOverrides } from "../utils/storage";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/Card";
import { radius, spacing, palette, shadows } from "../theme/tokens";

const shreejiLogo = require("../../assets/shreeji.png");

type AuthScreenProps = {
  onLogin: () => void;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [flat, setFlat] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const getAllUsers = async () => {
    const registered = await getRegisteredUsers();
    return [...SocietyData.users, ...registered];
  };

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const matchUser = (users: any[], identifier: string) => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed.includes("@")) {
      return users.find((u) => u.email.toLowerCase() === trimmed) || null;
    }
    const inputDigits = normalizePhone(trimmed);
    const inputLast10 = inputDigits.slice(-10);
    return users.find((u) => {
      const userDigits = normalizePhone(u.phone || "");
      const userLast10 = userDigits.slice(-10);
      return userDigits === inputDigits || userLast10 === inputLast10;
    }) || null;
  };

  const handleLogin = async () => {
    const users = await getAllUsers();
    const overrides = await getPasswordOverrides();
    const user = matchUser(users, loginEmail);
    if (!user) {
      Alert.alert("Login Failed", "Invalid email/phone or password.");
      return;
    }
    const expectedPassword = overrides[user.email.toLowerCase()] || user.password;
    if (expectedPassword !== loginPassword) {
      Alert.alert("Login Failed", "Invalid email/phone or password.");
      return;
    }
    await setSession({
      id: String(user.id),
      name: user.name,
      email: user.email,
      flat: user.flat,
      block: user.block,
      role: user.role,
      phone: user.phone
    });
    onLogin();
  };

  const handleRegister = async () => {
    if (!name || !email || !flat || !phone || password.length < 6) {
      Alert.alert("Invalid", "Please fill all fields. Password must be at least 6 characters.");
      return;
    }
    const users = await getAllUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      Alert.alert("Account Exists", "Email already registered. Please login.");
      return;
    }
    const inputDigits = normalizePhone(phone);
    if (users.some((u) => normalizePhone(u.phone || "") === inputDigits)) {
      Alert.alert("Account Exists", "Phone already registered. Please login.");
      return;
    }
    const block = flat.trim()[0]?.toUpperCase() || "A";
    const registered = await getRegisteredUsers();
    const newUser = {
      id: Date.now(),
      name,
      email: email.toLowerCase(),
      flat,
      block,
      role: "Resident",
      phone,
      password
    };
    registered.push(newUser);
    await setRegisteredUsers(registered);
    await setSession({
      id: String(newUser.id),
      name: newUser.name,
      email: newUser.email,
      flat: newUser.flat,
      block: newUser.block,
      role: newUser.role,
      phone: newUser.phone
    });
    onLogin();
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
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Shreenathji Angan",
      fallbackLabel: "Use passcode"
    });
    if (result.success) {
      const lastSession = await getSession();
      if (lastSession?.email) {
        setLoginEmail(lastSession.email);
        Alert.alert("Biometric Success", `Welcome back, ${lastSession.name || "User"}! Enter your password to continue.`);
      } else {
        Alert.alert("No Session", "No previous login found. Please login manually first.");
      }
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ alignItems: "center", marginBottom: spacing.lg, marginTop: spacing.xl }}>
        <View style={{ ...shadows.glow, borderRadius: 40, marginBottom: spacing.md }}>
          <Image source={shreejiLogo} style={{ width: 80, height: 80, borderRadius: 40 }} resizeMode="cover" />
        </View>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text, fontFamily: "Poppins_700Bold" }}>Shreenathji Angan</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular" }}>A Community That Feels Like Family</Text>
      </View>

      <Card>
        <View style={{ flexDirection: "row", backgroundColor: `${palette.primary}15`, borderRadius: radius.full, padding: 4, marginBottom: spacing.md }}>
          <Pressable
            onPress={() => setTab("login")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.full,
              overflow: "hidden",
            }}
          >
            {tab === "login" ? (
              <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: "center", borderRadius: radius.full }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Login</Text>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>Login</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setTab("register")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.full,
              overflow: "hidden",
            }}
          >
            {tab === "register" ? (
              <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: "center", borderRadius: radius.full }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Register</Text>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>Register</Text>
              </View>
            )}
          </Pressable>
        </View>

        {tab === "login" ? (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Welcome Back</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>Login to access your society portal</Text>
            <TextInput
              placeholder="Email or Phone"
              placeholderTextColor={colors.textMuted}
              value={loginEmail}
              onChangeText={setLoginEmail}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              autoCapitalize="none"
              keyboardType="default"
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={loginPassword}
              onChangeText={setLoginPassword}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              secureTextEntry
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
              <Pressable onPress={handleBiometric} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: radius.md, alignItems: "center" }}>
                <Text style={{ fontWeight: "600", color: colors.text }}>🔒 Biometric</Text>
              </Pressable>
              <Pressable onPress={() => Alert.alert("Voice Login", "Voice login is ready for future integrations.")} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: radius.md, alignItems: "center" }}>
                <Text style={{ fontWeight: "600", color: colors.text }}>🎙️ Voice</Text>
              </Pressable>
            </View>
            <Pressable onPress={handleLogin} style={{ borderRadius: radius.md, overflow: "hidden" }}>
              <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 14, borderRadius: radius.md, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>🔓 Login to Portal</Text>
              </LinearGradient>
            </Pressable>
            <Text style={{ marginTop: spacing.sm, color: colors.textSecondary }}>
              Login with email or phone. Default password is SA@ + last 4 digits of phone.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>New Registration</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>Register as a society resident</Text>
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              placeholder="Flat Number"
              placeholderTextColor={colors.textMuted}
              value={flat}
              onChangeText={setFlat}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
            />
            <TextInput
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm, color: colors.text }}
              secureTextEntry
            />
            <Pressable onPress={handleRegister} style={{ borderRadius: radius.md, overflow: "hidden" }}>
              <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 14, borderRadius: radius.md, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>📝 Register Now</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </Card>
    </ScrollView>
  );
};
