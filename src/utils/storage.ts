import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import * as Crypto from "expo-crypto";

// ─── Password Hashing (SHA-256) ──────────────────────────────────
// Passwords are stored with a prefix so we can distinguish hashed from legacy.
const HASH_PREFIX = "$sha256$";

/** Hash a plaintext password with SHA-256. Returns a prefixed hex string. */
export const hashPassword = async (plain: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    plain,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return HASH_PREFIX + digest;
};

/**
 * Verify a password input against a stored value.
 * Handles both hashed ($sha256$...) and legacy plaintext formats.
 * Returns [isMatch, needsMigration] — if needsMigration is true,
 * the caller should immediately hash+save the password.
 */
export const verifyPassword = async (
  input: string,
  stored: string
): Promise<[isMatch: boolean, needsMigration: boolean]> => {
  if (stored.startsWith(HASH_PREFIX)) {
    const inputHash = await hashPassword(input);
    return [inputHash === stored, false];
  }
  // Legacy plaintext — accept if matching, flag for migration
  return [input === stored, input === stored];
};

// ─── Session (intentionally device-local) ───────────────────────
export const setSession = async (user: Record<string, string>) => {
  await AsyncStorage.setItem("sa_user", JSON.stringify(user));
};

export const getSession = async () => {
  const raw = await AsyncStorage.getItem("sa_user");
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  await AsyncStorage.removeItem("sa_user");
};

// ─── Action Usage (intentionally device-local for UX) ──────────
export const getActionUsage = async () => {
  const raw = await AsyncStorage.getItem("sa_action_usage");
  return raw ? JSON.parse(raw) : {};
};

export const setActionUsage = async (usage: Record<string, number>) => {
  await AsyncStorage.setItem("sa_action_usage", JSON.stringify(usage));
};

// ─── Registered Users (Supabase — shared across devices) ────────
export const getRegisteredUsers = async (): Promise<Record<string, any>[]> => {
  const { data, error } = await supabase.from("registered_users").select("*");
  if (error) {
    const raw = await AsyncStorage.getItem("sa_registered_users");
    return raw ? JSON.parse(raw) : [];
  }
  return data ?? [];
};

export const setRegisteredUsers = async (users: Record<string, any>[]) => {
  if (!users.length) return;
  // Hash any plaintext passwords before persisting
  const safeUsers = await Promise.all(
    users.map(async (u) => {
      if (u.password && !u.password.startsWith(HASH_PREFIX)) {
        return { ...u, password: await hashPassword(u.password) };
      }
      return u;
    })
  );
  const { error } = await supabase.from("registered_users").upsert(safeUsers);
  if (__DEV__ && error) console.warn("[storage] setRegisteredUsers:", error.message);
};

// ─── Password Overrides (Supabase — shared) ─────────────────────
export const getPasswordOverrides = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase.from("password_overrides").select("email, password");
  if (error) {
    const raw = await AsyncStorage.getItem("sa_password_overrides");
    return raw ? JSON.parse(raw) : {};
  }
  const result: Record<string, string> = {};
  (data ?? []).forEach((row: any) => { result[row.email] = row.password; });
  return result;
};

export const setPasswordOverrides = async (overrides: Record<string, string>) => {
  // Hash any plaintext entries before persisting
  const hashEntries = await Promise.all(
    Object.entries(overrides).map(async ([email, password]) => ({
      email,
      password: password.startsWith(HASH_PREFIX) ? password : await hashPassword(password),
    }))
  );
  if (!hashEntries.length) return;
  const { error } = await supabase.from("password_overrides").upsert(hashEntries);
  if (__DEV__ && error) console.warn("[storage] setPasswordOverrides:", error.message);
};

export const setPasswordOverride = async (email: string, password: string) => {
  // Always persist the hash, never plaintext
  const hashed = password.startsWith(HASH_PREFIX) ? password : await hashPassword(password);
  const { error } = await supabase
    .from("password_overrides")
    .upsert({ email: email.toLowerCase(), password: hashed });
  if (error) throw error;
};

// ─── Profile Photos (Supabase Storage + profiles table) ─────────
export const getProfilePhotos = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, photo_url")
    .not("photo_url", "is", null);
  if (error) {
    const raw = await AsyncStorage.getItem("sa_profile_photos");
    return raw ? JSON.parse(raw) : {};
  }
  const result: Record<string, string> = {};
  (data ?? []).forEach((row: any) => { if (row.photo_url) result[row.email] = row.photo_url; });
  return result;
};

// Returns the public URL stored in Supabase (or the local URI on fallback)
export const setProfilePhoto = async (email: string, uri: string): Promise<string> => {
  // SSRF guard: only allow local file / content URIs from the device picker
  const isLocalUri = uri.startsWith("file://") || uri.startsWith("content://") ||
    uri.startsWith("ph://") || uri.startsWith("/");
  if (!isLocalUri) {
    console.warn("[storage] setProfilePhoto: rejected non-local URI");
    return uri;
  }
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const rawExt = uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
    const path = `profiles/${email.toLowerCase()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, blob, { upsert: true, contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
    // Append cache-buster so the new photo is shown immediately
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").upsert({ email: email.toLowerCase(), photo_url: publicUrl });
    return publicUrl;
  } catch (err: any) {
    if (__DEV__) console.warn("[storage] setProfilePhoto upload failed, using local URI:", err.message);
    // Graceful fallback: store local URI
    await supabase.from("profiles").upsert({ email: email.toLowerCase(), photo_url: uri });
    return uri;
  }
};

// ─── Profile Bio (Supabase profiles table) ─────────────────────
export const getProfileBios = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, bio")
    .not("bio", "is", null);
  if (error) {
    const raw = await AsyncStorage.getItem("sa_profile_bios");
    return raw ? JSON.parse(raw) : {};
  }
  const result: Record<string, string> = {};
  (data ?? []).forEach((row: any) => { if (row.bio) result[row.email] = row.bio; });
  return result;
};

export const setProfileBio = async (userId: string, bio: string) => {
  const { error } = await supabase
    .from("profiles")
    .upsert({ email: userId.toLowerCase(), bio });
  if (__DEV__ && error) console.warn("[storage] setProfileBio:", error.message);
};

// ─── Notifications (Supabase — shared) ──────────────────────────
export type AppNotification = {
  id: number;
  title: string;
  message: string;
  icon: string;
  date: string;
  read: string[];
  targetType: string;
  targetUser?: string;
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    const raw = await AsyncStorage.getItem("sa_notifications");
    return raw ? JSON.parse(raw) : [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    icon: row.icon,
    date: row.date,
    read: row.reads ?? [],
    targetType: row.target_type,
    targetUser: row.target_user,
  }));
};

export const setNotifications = async (items: AppNotification[]) => {
  const rows = items.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    icon: n.icon,
    date: n.date,
    target_type: n.targetType,
    target_user: n.targetUser,
    reads: n.read,
  }));
  if (!rows.length) return;
  await supabase.from("notifications").upsert(rows);
};

export const addNotification = async (n: Omit<AppNotification, "id" | "read">) => {
  const entry = {
    id: Date.now(),
    title: n.title,
    message: n.message,
    icon: n.icon,
    date: n.date,
    target_type: n.targetType,
    target_user: n.targetUser,
    reads: [] as string[],
  };
  const { error } = await supabase.from("notifications").insert(entry);
  if (__DEV__ && error) console.warn("[storage] addNotification:", error.message);
  return { ...entry, read: [], targetType: n.targetType, targetUser: n.targetUser } as AppNotification;
};

export const markNotificationRead = async (id: number, userEmail: string) => {
  const { data } = await supabase
    .from("notifications")
    .select("reads")
    .eq("id", id)
    .single();
  const reads: string[] = data?.reads ?? [];
  if (!reads.includes(userEmail)) {
    await supabase
      .from("notifications")
      .update({ reads: [...reads, userEmail] })
      .eq("id", id);
  }
};

// ─── Payment Types (Supabase — admin-managed, shared) ───────────
export type PaymentType = {
  id: number;
  name: string;
  amount: number;
  period: string;
  description: string;
};

export const getPaymentTypes = async (): Promise<PaymentType[] | null> => {
  const { data, error } = await supabase.from("payment_types").select("*");
  if (error) {
    const raw = await AsyncStorage.getItem("sa_payment_types");
    return raw ? JSON.parse(raw) : null;
  }
  return data?.length ? (data as PaymentType[]) : null;
};

export const setPaymentTypes = async (types: PaymentType[]) => {
  const { error } = await supabase.from("payment_types").upsert(types);
  if (__DEV__ && error) console.warn("[storage] setPaymentTypes:", error.message);
};

// ─── Payment History (Supabase — shared) ────────────────────────
export type PaymentRecord = {
  id: number;
  date: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  userEmail?: string;
};

export const getPaymentHistory = async (): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from("payment_history")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    const raw = await AsyncStorage.getItem("sa_payment_history");
    return raw ? JSON.parse(raw) : [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    amount: row.amount,
    method: row.method,
    status: row.status,
    reference: row.reference,
    userEmail: row.user_email,
  }));
};

export const setPaymentHistory = async (records: PaymentRecord[]) => {
  const rows = records.map((r) => ({
    id: r.id,
    date: r.date,
    type: r.type,
    amount: r.amount,
    method: r.method,
    status: r.status,
    reference: r.reference,
    user_email: r.userEmail,
  }));
  if (!rows.length) return;
  await supabase.from("payment_history").upsert(rows);
};

export const addPaymentRecord = async (record: Omit<PaymentRecord, "id">): Promise<PaymentRecord> => {
  const entry = { ...record, id: Date.now() };
  const { error } = await supabase.from("payment_history").insert({
    id: entry.id,
    date: entry.date,
    type: entry.type,
    amount: entry.amount,
    method: entry.method,
    status: entry.status,
    reference: entry.reference,
    user_email: entry.userEmail,
  });
  if (__DEV__ && error) console.warn("[storage] addPaymentRecord:", error.message);
  return entry;
};

// ─── Complaints (Supabase — shared) ─────────────────────────────
export type ComplaintRecord = {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  date: string;
  raisedBy: string;
  raisedByEmail?: string;
  icon: string;
  adminNote?: string;
};

export const getComplaints = async (): Promise<ComplaintRecord[] | null> => {
  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    const raw = await AsyncStorage.getItem("sa_complaints");
    return raw ? JSON.parse(raw) : null;
  }
  if (!data || data.length === 0) return null;
  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    category: row.category,
    date: row.date,
    raisedBy: row.raised_by,
    raisedByEmail: row.raised_by_email,
    icon: row.icon,
    adminNote: row.admin_note,
  }));
};

export const setComplaints = async (complaints: ComplaintRecord[]) => {
  const rows = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    category: c.category,
    date: c.date,
    raised_by: c.raisedBy,
    raised_by_email: c.raisedByEmail,
    icon: c.icon,
    admin_note: c.adminNote,
  }));
  if (!rows.length) return;
  await supabase.from("complaints").upsert(rows);
};

export const addComplaint = async (c: Omit<ComplaintRecord, "id">): Promise<ComplaintRecord> => {
  const entry: ComplaintRecord = { ...c, id: Date.now() };
  const { error } = await supabase.from("complaints").insert({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    status: entry.status,
    category: entry.category,
    date: entry.date,
    raised_by: entry.raisedBy,
    raised_by_email: entry.raisedByEmail,
    icon: entry.icon,
  });
  if (__DEV__ && error) console.warn("[storage] addComplaint:", error.message);
  return entry;
};

export const updateComplaintStatus = async (id: number, status: string, adminNote?: string) => {
  const update: Record<string, any> = { status };
  if (adminNote !== undefined) update.admin_note = adminNote;
  const { error } = await supabase.from("complaints").update(update).eq("id", id);
  if (__DEV__ && error) console.warn("[storage] updateComplaintStatus:", error.message);
};

// ─── Polls (Supabase — shared votes) ────────────────────────────
export const getPolls = async (): Promise<any[] | null> => {
  const { data, error } = await supabase.from("polls").select("id, data");
  if (error) {
    const raw = await AsyncStorage.getItem("sa_polls");
    return raw ? JSON.parse(raw) : null;
  }
  if (!data || data.length === 0) return null;
  return data.map((row: any) => ({ ...row.data, id: row.id }));
};

export const setPolls = async (polls: any[]) => {
  const rows = polls.map((p) => ({ id: p.id, data: p }));
  const { error } = await supabase.from("polls").upsert(rows);
  if (__DEV__ && error) console.warn("[storage] setPolls:", error.message);
};

// ─── Events / Posts (Supabase — shared) ─────────────────────────
// Upload an event image to Supabase storage and return CDN URL
export const uploadEventImage = async (eventId: number, uri: string): Promise<string> => {
  // SSRF guard: only allow local device URIs
  const isLocalUri = uri.startsWith("file://") || uri.startsWith("content://") ||
    uri.startsWith("ph://") || uri.startsWith("/");
  if (!isLocalUri) {
    if (__DEV__) console.warn("[storage] uploadEventImage: rejected non-local URI");
    return uri;
  }
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const rawExt = uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
    const path = `events/${eventId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, blob, { upsert: true, contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  } catch (err: any) {
    if (__DEV__) console.warn("[storage] uploadEventImage failed, using local URI:", err.message);
    return uri;
  }
};

export const getEvents = async (): Promise<any[] | null> => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    const raw = await AsyncStorage.getItem("sa_events");
    return raw ? JSON.parse(raw) : null;
  }
  if (!data || data.length === 0) return null;
  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    caption: row.caption,
    date: row.date,
    category: row.category,
    gradient: row.gradient,
    icon: row.icon,
    postedBy: row.posted_by,
    imageUri: row.image_uri ?? undefined,
    likes: row.likes ?? [],
    saved: row.saved ?? [],
    views: row.views ?? 0,
    comments: row.comments ?? [],
  }));
};

export const setEvents = async (events: any[]) => {
  if (!events.length) return;
  const rows = events.map((e) => ({
    id: e.id,
    title: e.title,
    caption: e.caption,
    date: e.date,
    category: e.category,
    gradient: e.gradient,
    icon: e.icon,
    posted_by: e.postedBy,
    image_uri: e.imageUri ?? null,
    likes: e.likes ?? [],
    saved: e.saved ?? [],
    views: e.views ?? 0,
    comments: e.comments ?? [],
  }));
  const { error } = await supabase.from("events").upsert(rows);
  if (__DEV__ && error) console.warn("[storage] setEvents:", error.message);
};

export const deleteEvent = async (id: number) => {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (__DEV__ && error) console.warn("[storage] deleteEvent:", error.message);
};

// ─── Bookings (Supabase — shared) ───────────────────────────────
export type BookingRecord = {
  id: number;
  venue: string;
  date: string;
  purpose: string;
  bookedBy: string;
  bookedByEmail?: string;
  status: string;
  paymentStatus?: string; // 'Unpaid' | 'Paid'
};

export const getBookings = async (): Promise<BookingRecord[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (__DEV__) console.warn("[storage] getBookings:", error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    venue: row.venue,
    date: row.date,
    purpose: row.purpose,
    bookedBy: row.booked_by,
    bookedByEmail: row.booked_by_email,
    status: row.status,
    paymentStatus: row.payment_status ?? "Unpaid",
  }));
};

export const addBooking = async (b: Omit<BookingRecord, "id">): Promise<BookingRecord> => {
  const entry: BookingRecord = { ...b, id: Date.now() };
  const { error } = await supabase.from("bookings").insert({
    id: entry.id,
    venue: entry.venue,
    date: entry.date,
    purpose: entry.purpose,
    booked_by: entry.bookedBy,
    booked_by_email: entry.bookedByEmail,
    status: entry.status,
    payment_status: "Unpaid",
  });
  if (__DEV__ && error) console.warn("[storage] addBooking:", error.message);
  return entry;
};

export const updateBookingStatus = async (id: number, status: string) => {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (__DEV__ && error) console.warn("[storage] updateBookingStatus:", error.message);
};

export const updateBookingPayment = async (id: number, paymentStatus: string) => {
  const { error } = await supabase.from("bookings").update({ payment_status: paymentStatus }).eq("id", id);
  if (__DEV__ && error) console.warn("[storage] updateBookingPayment:", error.message);
};

export const cancelBooking = async (id: number) => {
  const { error } = await supabase.from("bookings").update({ status: "Cancelled" }).eq("id", id);
  if (__DEV__ && error) console.warn("[storage] cancelBooking:", error.message);
};

// ─── News Articles (Supabase — shared) ──────────────────────────
export interface NewsArticle {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  postedBy: string;
}

export const getNewsArticles = async (): Promise<NewsArticle[] | null> => {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    const raw = await AsyncStorage.getItem("sa_news");
    return raw ? JSON.parse(raw) : null;
  }
  if (!data || data.length === 0) return null;
  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    date: row.date,
    postedBy: row.posted_by,
  }));
};

export const addNewsArticle = async (article: Omit<NewsArticle, "id">): Promise<NewsArticle> => {
  const entry: NewsArticle = { ...article, id: Date.now() };
  const { error } = await supabase.from("news").insert({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    category: entry.category,
    date: entry.date,
    posted_by: entry.postedBy,
  });
  if (error) console.warn("[storage] addNewsArticle:", error.message);
  return entry;
};

export const setNewsArticles = async (articles: NewsArticle[]) => {
  const rows = articles.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    category: a.category,
    date: a.date,
    posted_by: a.postedBy,
  }));
  if (!rows.length) return;
  await supabase.from("news").upsert(rows);
};

// ─── Notices Read Tracking (AsyncStorage — device-local per user) ─
export const getNoticesReadList = async (userEmail: string): Promise<number[]> => {
  const key = `sa_notices_read_${userEmail.toLowerCase()}`;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
};

export const markNoticeReadByUser = async (noticeId: number, userEmail: string): Promise<void> => {
  const key = `sa_notices_read_${userEmail.toLowerCase()}`;
  const existing = await getNoticesReadList(userEmail);
  if (!existing.includes(noticeId)) {
    await AsyncStorage.setItem(key, JSON.stringify([...existing, noticeId]));
  }
};

// ─── Polls Management (admin create / close) ─────────────────────
export const addPoll = async (poll: any): Promise<any> => {
  const entry = { ...poll, id: Date.now() };
  const { error } = await supabase.from("polls").insert({ id: entry.id, data: entry });
  if (error) console.warn("[storage] addPoll:", error.message);
  return entry;
};

export const closePoll = async (id: number) => {
  const { data } = await supabase.from("polls").select("data").eq("id", id).single();
  if (data?.data) {
    await supabase.from("polls").update({ data: { ...data.data, status: "Closed" } }).eq("id", id);
  }
};

// ─── Biometric Preference (device-local) ─────────────────────────
export const getBiometricEnabled = async (): Promise<string | null> => {
  return AsyncStorage.getItem("sa_biometric_email");
};

export const setBiometricEnabled = async (email: string) => {
  await AsyncStorage.setItem("sa_biometric_email", email.toLowerCase());
};

export const clearBiometricEnabled = async () => {
  await AsyncStorage.removeItem("sa_biometric_email");
};

// ─── OTP Helpers (simulated — replace with real SMS gateway in prod) ──
let _otpStore: { code: string; expiresAt: number; target: string } | null = null;

/** Generate a 6-digit OTP bound to a phone/email. Returns the code. */
export const generateOTP = (target: string): string => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  _otpStore = { code, target: target.toLowerCase(), expiresAt: Date.now() + 5 * 60_000 };
  return code;
};

/** Verify the OTP. Returns true if valid & not expired, then clears the store. */
export const verifyOTP = (target: string, code: string): boolean => {
  if (!_otpStore) return false;
  if (_otpStore.target !== target.toLowerCase()) return false;
  if (Date.now() > _otpStore.expiresAt) { _otpStore = null; return false; }
  if (_otpStore.code !== code) return false;
  _otpStore = null;
  return true;
};

// ─── User Payment Summary ────────────────────────────────────────
export const getUserPaymentHistory = async (userEmail: string): Promise<PaymentRecord[]> => {
  const { data, error } = await supabase
    .from("payment_history")
    .select("*")
    .eq("user_email", userEmail.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) {
    const all = await getPaymentHistory();
    return all.filter((r) => r.userEmail?.toLowerCase() === userEmail.toLowerCase());
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    amount: row.amount,
    method: row.method,
    status: row.status,
    reference: row.reference,
    userEmail: row.user_email,
  }));
};
