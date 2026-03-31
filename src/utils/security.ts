/**
 * Security utilities — salted password hashing, input validation, rate limiting,
 * secure session management, and integrity helpers.
 */
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// ─── Salted SHA-256 Password Hashing ────────────────────────────
// Passwords are stored as: $sha256s$<hex-salt>$<hex-hash>
// The salt is 16 random bytes, making every hash unique.
const SALTED_PREFIX = "$sha256s$";
const LEGACY_PREFIX = "$sha256$"; // old unsalted format — still accepted for verification

/** Generate 16 bytes of cryptographic randomness as hex. */
const generateSalt = async (): Promise<string> => {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Hash a password with a random salt. Returns `$sha256s$<salt>$<hash>`. */
export const hashPassword = async (plain: string): Promise<string> => {
  const salt = await generateSalt();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + plain,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return `${SALTED_PREFIX}${salt}$${digest}`;
};

/**
 * Verify a password against a stored hash.
 * Supports: salted ($sha256s$), legacy unsalted ($sha256$), and plaintext.
 * Returns [isMatch, needsMigration].
 */
export const verifyPassword = async (
  input: string,
  stored: string,
): Promise<[isMatch: boolean, needsMigration: boolean]> => {
  if (stored.startsWith(SALTED_PREFIX)) {
    const parts = stored.slice(SALTED_PREFIX.length).split("$");
    if (parts.length !== 2) return [false, false];
    const [salt, storedHash] = parts;
    const inputHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      salt + input,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    return [inputHash === storedHash, false];
  }
  if (stored.startsWith(LEGACY_PREFIX)) {
    const storedHash = stored.slice(LEGACY_PREFIX.length);
    const inputHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    return [inputHash === storedHash, inputHash === storedHash]; // migrate if match
  }
  // Plaintext fallback (legacy data)
  return [input === stored, input === stored];
};

// ─── Secure Session (SecureStore-backed) ────────────────────────
const SESSION_KEY = "sa_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SecureSession = {
  id: string;
  name: string;
  email: string;
  flat: string;
  block: string;
  role: string;
  phone: string;
  expiresAt: number;
};

export const setSecureSession = async (user: Omit<SecureSession, "expiresAt">): Promise<void> => {
  const session: SecureSession = { ...user, expiresAt: Date.now() + SESSION_TTL_MS };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

export const getSecureSession = async (): Promise<SecureSession | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const session: SecureSession = JSON.parse(raw);
    if (session.expiresAt < Date.now()) {
      await clearSecureSession();
      return null;
    }
    return session;
  } catch {
    await clearSecureSession();
    return null;
  }
};

export const clearSecureSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

// ─── Secure Biometric Preference ────────────────────────────────
const BIOMETRIC_KEY = "sa_biometric_email";

export const getSecureBiometricEnabled = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(BIOMETRIC_KEY);
};

export const setSecureBiometricEnabled = async (email: string): Promise<void> => {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, email.toLowerCase());
};

export const clearSecureBiometricEnabled = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
};

// ─── Rate Limiting (exponential backoff) ────────────────────────
const RATE_LIMIT_KEY = "sa_rate_limit";

type RateLimitState = {
  attempts: number;
  lockoutUntil: number;
};

const getBackoffMs = (attempts: number): number => {
  // 30s, 60s, 120s, 300s, 600s (10min), ... capped at 30min
  const base = 30_000;
  const ms = base * Math.pow(2, Math.min(attempts - 5, 5));
  return Math.min(ms, 30 * 60_000);
};

export const getRateLimitState = async (): Promise<RateLimitState> => {
  const raw = await SecureStore.getItemAsync(RATE_LIMIT_KEY);
  if (!raw) return { attempts: 0, lockoutUntil: 0 };
  try { return JSON.parse(raw); } catch { return { attempts: 0, lockoutUntil: 0 }; }
};

export const recordFailedAttempt = async (): Promise<RateLimitState> => {
  const state = await getRateLimitState();
  state.attempts += 1;
  if (state.attempts >= 5) {
    state.lockoutUntil = Date.now() + getBackoffMs(state.attempts);
  }
  await SecureStore.setItemAsync(RATE_LIMIT_KEY, JSON.stringify(state));
  return state;
};

export const resetRateLimit = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(RATE_LIMIT_KEY);
};

export const isLockedOut = async (): Promise<{ locked: boolean; remainingSec: number }> => {
  const state = await getRateLimitState();
  if (state.lockoutUntil <= Date.now()) return { locked: false, remainingSec: 0 };
  return { locked: true, remainingSec: Math.ceil((state.lockoutUntil - Date.now()) / 1000) };
};

// ─── Input Validation & Sanitization ────────────────────────────
export const MAX_LENGTHS = {
  name: 50,
  email: 120,
  phone: 15,
  flat: 10,
  password: 128,
  bio: 120,
  complaintTitle: 100,
  complaintDesc: 500,
  notificationTitle: 100,
  notificationMessage: 500,
  comment: 300,
  postText: 500,
  pollTitle: 100,
  pollDesc: 300,
  pollOption: 100,
  bookingPurpose: 150,
  adminNote: 500,
  paymentTypeName: 50,
  paymentTypeDesc: 200,
  paymentTypePeriod: 30,
  newsTitle: 100,
  newsDescription: 1000,
} as const;

/** Strip HTML tags and limit length. */
export const sanitizeText = (text: string, maxLength: number): string => {
  return text.replace(/<[^>]*>/g, "").slice(0, maxLength).trim();
};

/** Validate password strength: 8+ chars, at least 1 letter and 1 digit. */
export const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  return null;
};

/** Basic email format check. */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// ─── ADMIN_ROLES constant ───────────────────────────────────────
export const ADMIN_ROLES = ["Admin", "President", "Secretary"] as const;
export const isAdminRole = (role: string | undefined): boolean =>
  ADMIN_ROLES.includes(role as any);

// ─── Device Integrity / RASP ────────────────────────────────────
import * as Device from "expo-device";
import * as Application from "expo-application";

export interface DeviceIntegrityResult {
  isPhysicalDevice: boolean;
  isEmulator: boolean;
  deviceName: string | null;
  osVersion: string | null;
  appVersion: string | null;
  buildNumber: string | null;
}

/** Gather device integrity info. Callers can block emulators in prod if desired. */
export const checkDeviceIntegrity = async (): Promise<DeviceIntegrityResult> => {
  const isPhysical = Device.isDevice; // true = real device, false = simulator/emulator
  return {
    isPhysicalDevice: isPhysical,
    isEmulator: !isPhysical,
    deviceName: Device.deviceName,
    osVersion: Device.osVersion,
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
  };
};
