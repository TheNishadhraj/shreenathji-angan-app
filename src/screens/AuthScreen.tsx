import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { SocietyData } from "../data/societyData";
import {
  setRegisteredUsers,
  getRegisteredUsers,
  setSession,
  getSession,
  getPasswordOverrides,
  hashPassword,
  verifyPassword,
  setPasswordOverride,
  getBiometricEnabled,
  generateOTP,
  verifyOTP,
} from "../utils/storage";
import {
  validatePasswordStrength,
  isValidEmail,
  recordFailedAttempt,
  resetRateLimit,
  isLockedOut,
  sanitizeText,
  MAX_LENGTHS,
} from "../utils/security";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, palette, shadows, typography } from "../theme/tokens";

const shreejiLogo = require("../../assets/shreeji.png");

type AuthScreenProps = { onLogin: () => void };
type AuthView = "login" | "register" | "verify-register" | "forgot" | "forgot-otp" | "forgot-reset";

// ── Shared helpers ──────────────────────────────────────────────
const mkInput = (c: any, extra?: any) => ({
  borderWidth: 1,
  borderColor: c.inputBorder || c.border,
  borderRadius: radius.md,
  padding: 14,
  color: c.text,
  fontFamily: "Inter_400Regular" as const,
  fontSize: 15,
  backgroundColor: c.inputBg || "transparent",
  ...extra,
});
const mkLabel = (c: any) => ({
  fontFamily: "Inter_600SemiBold" as const,
  fontSize: 13,
  color: c.textSecondary,
  marginBottom: 6,
});

// ── OTP digit input ─────────────────────────────────────────────
const OTPInput: React.FC<{ value: string; onChange: (v: string) => void; colors: any }> = ({
  value,
  onChange,
  colors,
}) => {
  const refs = useRef<(TextInput | null)[]>([]);
  const digits = value.padEnd(6, " ").split("");
  const handleChange = (text: string, idx: number) => {
    const clean = text.replace(/\D/g, "");
    const arr = value.split("");
    arr[idx] = clean.slice(-1) || "";
    onChange(arr.join(""));
    if (clean && idx < 5) refs.current[idx + 1]?.focus();
  };
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginVertical: spacing.md }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          value={digits[i]?.trim() || ""}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && !digits[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          keyboardType="number-pad"
          maxLength={1}
          style={{
            width: 46,
            height: 54,
            borderWidth: 2,
            borderColor: digits[i]?.trim() ? palette.primary : colors.border,
            borderRadius: radius.md,
            textAlign: "center" as const,
            fontSize: 22,
            fontFamily: "Poppins_700Bold" as const,
            color: colors.text,
            backgroundColor: colors.inputBg || "transparent",
          }}
        />
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { colors, isDark } = useTheme();
  const [view, setView] = useState<AuthView>("login");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regFlat, setRegFlat] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // OTP (register)
  const [regOtp, setRegOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Forgot password
  const [forgotId, setForgotId] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPwd, setForgotNewPwd] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotUser, setForgotUser] = useState<any>(null);

  // Biometric
  const [bioReady, setBioReady] = useState(false);
  const [bioEmail, setBioEmail] = useState<string | null>(null);

  // Rate-limiting (persisted in SecureStore with exponential backoff)
  const [lockRemaining, setLockRemaining] = useState(0);

  // Loading
  const [loading, setLoading] = useState(false);

  // ── Timers ────────────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // Refresh lockout on mount and periodically
  useEffect(() => {
    const check = async () => {
      const { locked, remainingSec } = await isLockedOut();
      setLockRemaining(locked ? remainingSec : 0);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const email = await getBiometricEnabled();
      setBioReady(hw && enrolled);
      setBioEmail(email);
    })();
  }, []);

  // ── User helpers ──────────────────────────────────────────────
  const getAllUsers = async () => {
    const reg = await getRegisteredUsers();
    return [...SocietyData.users, ...reg];
  };
  const normalizePhone = (v: string) => v.replace(/\D/g, "");
  const matchUser = (users: any[], id: string) => {
    const t = id.trim().toLowerCase();
    if (!t) return null;
    if (t.includes("@")) return users.find((u) => u.email.toLowerCase() === t) || null;
    const d = normalizePhone(t);
    const d10 = d.slice(-10);
    return users.find((u) => {
      const ud = normalizePhone(u.phone || "");
      return ud === d || ud.slice(-10) === d10;
    }) || null;
  };

  // ═══════ LOGIN ════════════════════════════════════════════════
  const handleLogin = async () => {
    const { locked, remainingSec } = await isLockedOut();
    if (locked) {
      Alert.alert("Locked", `Too many failed attempts. Try again in ${remainingSec}s.`);
      return;
    }
    if (!loginEmail.trim() || !loginPassword) {
      Alert.alert("Required", "Please enter your email/phone and password.");
      return;
    }
    setLoading(true);
    try {
      const users = await getAllUsers();
      const overrides = await getPasswordOverrides();
      const user = matchUser(users, loginEmail);
      if (!user) { await bumpFail(); return; }
      const stored = overrides[user.email.toLowerCase()] || user.password;
      if (!stored) { await bumpFail(); return; }
      const [ok, migrate] = await verifyPassword(loginPassword, stored);
      if (!ok) { await bumpFail(); return; }
      await resetRateLimit();
      setLockRemaining(0);
      // Migrate legacy hash to salted hash on successful login
      if (migrate) { try { await setPasswordOverride(user.email, loginPassword); } catch {} }
      await doLogin(user);
    } finally {
      setLoading(false);
    }
  };

  const bumpFail = async () => {
    const state = await recordFailedAttempt();
    if (state.attempts >= 5) {
      const secs = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
      setLockRemaining(secs);
      Alert.alert("Locked", `Too many failed attempts. Try again in ${secs}s.`);
    } else {
      Alert.alert("Login Failed", `Invalid credentials. ${5 - state.attempts} attempt${5 - state.attempts !== 1 ? "s" : ""} remaining.`);
    }
  };

  const doLogin = async (u: any) => {
    await setSession({
      id: String(u.id), name: u.name, email: u.email,
      flat: u.flat, block: u.block, role: u.role, phone: u.phone,
    });
    onLogin();
  };

  // ═══════ BIOMETRIC ════════════════════════════════════════════
  const handleBio = async () => {
    if (!bioEmail) return;
    const sess = await getSession();
    if (!sess?.email) { Alert.alert("No Session", "Sign in with password first."); return; }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in as ${sess.name || sess.email}`,
      fallbackLabel: "Use passcode",
    });
    if (res.success) { await setSession(sess); onLogin(); }
  };

  // ═══════ REGISTER ═════════════════════════════════════════════
  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) { Alert.alert("Required", "Enter your full name."); return; }
    if (!isValidEmail(regEmail)) { Alert.alert("Invalid", "Enter a valid email."); return; }
    if (normalizePhone(regPhone).length < 10) { Alert.alert("Invalid", "Enter a 10-digit phone number."); return; }
    if (!regFlat.trim()) { Alert.alert("Required", "Enter your flat number."); return; }
    const pwdErr = validatePasswordStrength(regPassword);
    if (pwdErr) { Alert.alert("Weak Password", pwdErr); return; }
    if (regPassword !== regConfirm) { Alert.alert("Mismatch", "Passwords don't match."); return; }
    setLoading(true);
    try {
      const users = await getAllUsers();
      if (users.some((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
        Alert.alert("Exists", "Email already registered."); return;
      }
      const pd = normalizePhone(regPhone);
      if (users.some((u) => normalizePhone(u.phone || "") === pd)) {
        Alert.alert("Exists", "Phone already registered."); return;
      }
      const { delivered, code } = await generateOTP(regPhone, "register");
      setOtpSentTo(pd.slice(-4));
      setResendTimer(60);
      setView("verify-register");
      if (delivered) {
        Alert.alert("OTP Sent", "Verification code sent to your email.");
      } else if (code) {
        Alert.alert("Dev OTP", `${code}`);
      } else {
        Alert.alert("OTP Sent", "Check your registered email for the verification code.");
      }
    } finally { setLoading(false); }
  };

  const handleVerifyRegister = async () => {
    if (regOtp.length !== 6) { Alert.alert("Invalid", "Enter the 6-digit code."); return; }
    const otpOk = await verifyOTP(regPhone, regOtp, "register");
    if (!otpOk) { Alert.alert("Invalid OTP", "Incorrect or expired code."); return; }
    setLoading(true);
    try {
      const block = regFlat.trim()[0]?.toUpperCase() || "A";
      const hashed = await hashPassword(regPassword);
      const registered = await getRegisteredUsers();
      const newUser = {
        id: Date.now(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: regEmail.toLowerCase().trim(),
        flat: regFlat.trim().toUpperCase(),
        block,
        role: "Resident",
        phone: regPhone.trim(),
        password: hashed,
      };
      registered.push(newUser);
      await setRegisteredUsers(registered);
      await doLogin(newUser);
    } finally { setLoading(false); }
  };

  const resendRegOTP = async () => {
    if (resendTimer > 0) return;
    const { delivered, code } = await generateOTP(regPhone, "register");
    setResendTimer(60);
    if (delivered) Alert.alert("Sent", "New code sent to your email.");
    else if (code) Alert.alert("Dev OTP", `${code}`);
    else Alert.alert("Sent", "Check your registered email for the code.");
  };

  // ═══════ FORGOT PASSWORD ══════════════════════════════════════
  const handleForgotSend = async () => {
    if (!forgotId.trim()) { Alert.alert("Required", "Enter email or phone."); return; }
    setLoading(true);
    try {
      const users = await getAllUsers();
      const u = matchUser(users, forgotId);
      if (!u) { Alert.alert("Not Found", "No account found."); return; }
      setForgotUser(u);
      const { delivered, code } = await generateOTP(u.phone, "forgot");
      setResendTimer(60);
      setView("forgot-otp");
      if (delivered) Alert.alert("Sent", "Code sent to your registered email.");
      else if (code) Alert.alert("Dev OTP", `${code}`);
      else Alert.alert("Sent", "Check your registered email for the code.");
    } finally { setLoading(false); }
  };

  const handleForgotVerify = async () => {
    if (forgotOtp.length !== 6) { Alert.alert("Invalid", "Enter 6-digit code."); return; }
    const fOk = await verifyOTP(forgotUser?.phone || "", forgotOtp, "forgot");
    if (!fOk) { Alert.alert("Invalid OTP", "Incorrect or expired."); return; }
    setView("forgot-reset");
  };

  const handleForgotReset = async () => {
    const pwdErr = validatePasswordStrength(forgotNewPwd);
    if (pwdErr) { Alert.alert("Weak Password", pwdErr); return; }
    if (forgotNewPwd !== forgotConfirm) { Alert.alert("Mismatch", "Passwords don't match."); return; }
    setLoading(true);
    try {
      await setPasswordOverride(forgotUser.email, forgotNewPwd);
      Alert.alert("Success", "Password reset. You can sign in now.", [{ text: "OK", onPress: goLogin }]);
    } finally { setLoading(false); }
  };

  const forgotResend = async () => {
    if (resendTimer > 0 || !forgotUser) return;
    const { delivered, code } = await generateOTP(forgotUser.phone, "forgot");
    setResendTimer(60);
    if (delivered) Alert.alert("Sent", "New code sent to your email.");
    else if (code) Alert.alert("Dev OTP", `${code}`);
    else Alert.alert("Sent", "Check your registered email for the code.");
  };

  // ── Nav ───────────────────────────────────────────────────────
  const goLogin = () => {
    setView("login"); setLoginEmail(""); setLoginPassword("");
    setForgotId(""); setForgotOtp(""); setForgotNewPwd(""); setForgotConfirm(""); setForgotUser(null);
    setRegOtp("");
  };
  const goRegister = () => {
    setView("register"); setFirstName(""); setLastName("");
    setRegEmail(""); setRegPhone(""); setRegFlat(""); setRegPassword(""); setRegConfirm("");
  };

  // ── UI atoms ──────────────────────────────────────────────────
  const Btn: React.FC<{ label: string; onPress: () => void; disabled?: boolean }> = ({ label, onPress, disabled }) => (
    <Pressable onPress={onPress} disabled={disabled || loading} style={{ borderRadius: radius.lg, overflow: "hidden", opacity: disabled ? 0.5 : 1 }}>
      <LinearGradient colors={[palette.primary, palette.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingVertical: 16, alignItems: "center", borderRadius: radius.lg, flexDirection: "row", justifyContent: "center", gap: 8 }}>
        {loading && <ActivityIndicator size="small" color="#fff" />}
        <Text style={{ color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 16 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
  const Btn2: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
    <Pressable onPress={onPress} style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
      <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
  const Link: React.FC<{ pre: string; link: string; onPress: () => void }> = ({ pre, link, onPress }) => (
    <Text style={{ textAlign: "center", color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: spacing.md }}>
      {pre}{" "}<Text onPress={onPress} style={{ color: palette.primary, fontFamily: "Inter_600SemiBold" }}>{link}</Text>
    </Text>
  );
  const Or = () => (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: spacing.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ marginHorizontal: 12, color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
  const Back: React.FC<{ onPress: () => void }> = ({ onPress }) => (
    <Pressable onPress={onPress} style={{ alignSelf: "flex-start", marginBottom: spacing.md }}>
      <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
    </Pressable>
  );

  const card: any = {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  };
  const L = mkLabel(colors);
  const I = mkInput(colors);

  // ═══════════════════════════════════════════════════════════════
  //  LOGIN VIEW
  // ═══════════════════════════════════════════════════════════════
  const renderLogin = () => (
    <>
      <View style={{ alignItems: "center", marginTop: spacing.xxl, marginBottom: spacing.lg }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: `${palette.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: spacing.md, ...shadows.soft }}>
          <Image source={shreejiLogo} style={{ width: 58, height: 58, borderRadius: 29 }} resizeMode="cover" />
        </View>
        <Text style={{ ...typography.caption, color: colors.textSecondary }}>Welcome back</Text>
        <Text style={{ ...typography.h1, color: colors.text, marginTop: 2 }}>Sign in to your</Text>
        <Text style={{ ...typography.h1, color: colors.text }}>account</Text>
      </View>

      <View style={card}>
        <Text style={L}>Email or Phone</Text>
        <TextInput placeholder="you@example.com" placeholderTextColor={colors.textMuted}
          value={loginEmail} onChangeText={setLoginEmail} style={I}
          autoCapitalize="none" keyboardType="email-address" maxLength={120} />

        <View style={{ height: spacing.md }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={L}>Password</Text>
          <Pressable onPress={() => { setView("forgot"); setForgotId(loginEmail); }}>
            <Text style={{ color: palette.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Forgot?</Text>
          </Pressable>
        </View>
        <View style={{ position: "relative" }}>
          <TextInput placeholder="Enter password" placeholderTextColor={colors.textMuted}
            value={loginPassword} onChangeText={setLoginPassword}
            style={mkInput(colors, { paddingRight: 48 })} secureTextEntry={!showPassword} maxLength={128} />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 14, top: 14 }}>
            <Text style={{ fontSize: 18, color: colors.textMuted }}>{showPassword ? "🙈" : "👁"}</Text>
          </Pressable>
        </View>

        {lockRemaining > 0 ? (
          <Text style={{ color: palette.danger, fontSize: 12, textAlign: "center", marginTop: spacing.sm, fontFamily: "Inter_400Regular" }}>
            Account locked. Try again in {lockRemaining}s.
          </Text>
        ) : null}

        <View style={{ height: spacing.lg }} />
        <Btn label="Sign In" onPress={handleLogin} />

        {bioReady && bioEmail && (
          <>
            <Or />
            <Btn2 label="🔐  Sign in with Fingerprint" onPress={handleBio} />
          </>
        )}
      </View>
      <Link pre="Don't have an account?" link="Register" onPress={goRegister} />
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  //  REGISTER VIEW
  // ═══════════════════════════════════════════════════════════════
  const renderRegister = () => (
    <>
      <View style={{ alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.md }}>
        <Text style={{ ...typography.caption, color: colors.textSecondary }}>Get started</Text>
        <Text style={{ ...typography.h1, color: colors.text, marginTop: 2 }}>Create your account</Text>
      </View>

      <View style={card}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={L}>First Name</Text>
            <TextInput placeholder="John" placeholderTextColor={colors.textMuted}
              value={firstName} onChangeText={setFirstName} style={I} maxLength={50} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={L}>Last Name</Text>
            <TextInput placeholder="Doe" placeholderTextColor={colors.textMuted}
              value={lastName} onChangeText={setLastName} style={I} maxLength={50} />
          </View>
        </View>
        <View style={{ height: spacing.sm }} />
        <Text style={L}>Email</Text>
        <TextInput placeholder="you@example.com" placeholderTextColor={colors.textMuted}
          value={regEmail} onChangeText={setRegEmail} style={I}
          autoCapitalize="none" keyboardType="email-address" maxLength={120} />
        <View style={{ height: spacing.sm }} />
        <Text style={L}>Mobile Number</Text>
        <TextInput placeholder="98XXXXXXXX" placeholderTextColor={colors.textMuted}
          value={regPhone} onChangeText={setRegPhone} style={I} keyboardType="phone-pad" maxLength={15} />
        <View style={{ height: spacing.sm }} />
        <Text style={L}>Flat Number</Text>
        <TextInput placeholder="A-10" placeholderTextColor={colors.textMuted}
          value={regFlat} onChangeText={setRegFlat} style={I} autoCapitalize="characters" maxLength={10} />
        <View style={{ height: spacing.sm }} />
        <Text style={L}>Password</Text>
        <View style={{ position: "relative" }}>
          <TextInput placeholder="Min. 8 chars, letters + numbers" placeholderTextColor={colors.textMuted}
            value={regPassword} onChangeText={setRegPassword}
            style={mkInput(colors, { paddingRight: 48 })} secureTextEntry={!showRegPwd} maxLength={128} />
          <Pressable onPress={() => setShowRegPwd(!showRegPwd)} style={{ position: "absolute", right: 14, top: 14 }}>
            <Text style={{ fontSize: 18, color: colors.textMuted }}>{showRegPwd ? "🙈" : "👁"}</Text>
          </Pressable>
        </View>
        <View style={{ height: spacing.sm }} />
        <Text style={L}>Confirm Password</Text>
        <View style={{ position: "relative" }}>
          <TextInput placeholder="Re-enter password" placeholderTextColor={colors.textMuted}
            value={regConfirm} onChangeText={setRegConfirm}
            style={mkInput(colors, { paddingRight: 48 })} secureTextEntry={!showRegConfirm} maxLength={128} />
          <Pressable onPress={() => setShowRegConfirm(!showRegConfirm)} style={{ position: "absolute", right: 14, top: 14 }}>
            <Text style={{ fontSize: 18, color: colors.textMuted }}>{showRegConfirm ? "🙈" : "👁"}</Text>
          </Pressable>
        </View>
        <View style={{ height: spacing.lg }} />
        <Btn label="Create Account" onPress={handleRegister} />
      </View>
      <Link pre="Already have an account?" link="Sign In" onPress={goLogin} />
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  //  VERIFY REGISTER OTP
  // ═══════════════════════════════════════════════════════════════
  const renderVerifyReg = () => (
    <>
      <Back onPress={() => setView("register")} />
      <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${palette.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
          <Text style={{ fontSize: 32 }}>📱</Text>
        </View>
        <Text style={{ ...typography.h2, color: colors.text }}>Verify Your Phone</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs }}>
          Enter the 6-digit code sent to{"\n"}****{otpSentTo}
        </Text>
      </View>
      <View style={card}>
        <OTPInput value={regOtp} onChange={setRegOtp} colors={colors} />
        <Btn label="Verify & Register" onPress={handleVerifyRegister} />
        <View style={{ alignItems: "center", marginTop: spacing.md }}>
          {resendTimer > 0 ? (
            <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>Resend in {resendTimer}s</Text>
          ) : (
            <Pressable onPress={resendRegOTP}>
              <Text style={{ color: palette.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Resend Code</Text>
            </Pressable>
          )}
        </View>
      </View>
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  //  FORGOT: ENTER IDENTIFIER
  // ═══════════════════════════════════════════════════════════════
  const renderForgot = () => (
    <>
      <Back onPress={goLogin} />
      <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${palette.warning}15`, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
          <Text style={{ fontSize: 32 }}>🔑</Text>
        </View>
        <Text style={{ ...typography.h2, color: colors.text }}>Forgot Password?</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs }}>
          Enter your registered email or phone.{"\n"}We'll send an OTP to your mobile.
        </Text>
      </View>
      <View style={card}>
        <Text style={L}>Email or Phone</Text>
        <TextInput placeholder="you@example.com or 98XXXXXXXX" placeholderTextColor={colors.textMuted}
          value={forgotId} onChangeText={setForgotId} style={I} autoCapitalize="none" maxLength={120} />
        <View style={{ height: spacing.lg }} />
        <Btn label="Send OTP" onPress={handleForgotSend} />
      </View>
      <Link pre="Remember your password?" link="Sign In" onPress={goLogin} />
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  //  FORGOT: VERIFY OTP
  // ═══════════════════════════════════════════════════════════════
  const renderForgotOtp = () => (
    <>
      <Back onPress={() => setView("forgot")} />
      <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${palette.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
          <Text style={{ fontSize: 32 }}>🔢</Text>
        </View>
        <Text style={{ ...typography.h2, color: colors.text }}>Enter Verification Code</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs }}>
          Sent to ****{normalizePhone(forgotUser?.phone || "").slice(-4)}
        </Text>
      </View>
      <View style={card}>
        <OTPInput value={forgotOtp} onChange={setForgotOtp} colors={colors} />
        <Btn label="Verify" onPress={handleForgotVerify} />
        <View style={{ alignItems: "center", marginTop: spacing.md }}>
          {resendTimer > 0 ? (
            <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>Resend in {resendTimer}s</Text>
          ) : (
            <Pressable onPress={forgotResend}>
              <Text style={{ color: palette.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Resend Code</Text>
            </Pressable>
          )}
        </View>
      </View>
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  //  FORGOT: RESET PASSWORD
  // ═══════════════════════════════════════════════════════════════
  const renderForgotReset = () => (
    <>
      <Back onPress={() => setView("forgot-otp")} />
      <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.md }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${palette.success}15`, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
          <Text style={{ fontSize: 32 }}>🔒</Text>
        </View>
        <Text style={{ ...typography.h2, color: colors.text }}>Reset Password</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs }}>
          Create a new password for{"\n"}{forgotUser?.email}
        </Text>
      </View>
      <View style={card}>
        <Text style={L}>New Password</Text>
        <TextInput placeholder="Min. 8 chars, letters + numbers" placeholderTextColor={colors.textMuted}
          value={forgotNewPwd} onChangeText={setForgotNewPwd} style={I} secureTextEntry maxLength={128} />
        <View style={{ height: spacing.sm }} />
        <Text style={L}>Confirm Password</Text>
        <TextInput placeholder="Re-enter password" placeholderTextColor={colors.textMuted}
          value={forgotConfirm} onChangeText={setForgotConfirm} style={I} secureTextEntry maxLength={128} />
        <View style={{ height: spacing.lg }} />
        <Btn label="Reset Password" onPress={handleForgotReset} />
      </View>
    </>
  );

  // ═══════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
      >
        {view === "login" && renderLogin()}
        {view === "register" && renderRegister()}
        {view === "verify-register" && renderVerifyReg()}
        {view === "forgot" && renderForgot()}
        {view === "forgot-otp" && renderForgotOtp()}
        {view === "forgot-reset" && renderForgotReset()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
