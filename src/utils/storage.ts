import AsyncStorage from "@react-native-async-storage/async-storage";

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

export const getRegisteredUsers = async () => {
  const raw = await AsyncStorage.getItem("sa_registered_users");
  return raw ? JSON.parse(raw) : [];
};

export const setRegisteredUsers = async (users: Record<string, string>[]) => {
  await AsyncStorage.setItem("sa_registered_users", JSON.stringify(users));
};

export const getPasswordOverrides = async () => {
  const raw = await AsyncStorage.getItem("sa_password_overrides");
  return raw ? JSON.parse(raw) : {};
};

export const setPasswordOverrides = async (overrides: Record<string, string>) => {
  await AsyncStorage.setItem("sa_password_overrides", JSON.stringify(overrides));
};

export const setPasswordOverride = async (email: string, password: string) => {
  const overrides = await getPasswordOverrides();
  overrides[email.toLowerCase()] = password;
  await setPasswordOverrides(overrides);
};

export const getActionUsage = async () => {
  const raw = await AsyncStorage.getItem("sa_action_usage");
  return raw ? JSON.parse(raw) : {};
};

export const setActionUsage = async (usage: Record<string, number>) => {
  await AsyncStorage.setItem("sa_action_usage", JSON.stringify(usage));
};

// ─── Profile Photos ─────────────────────────────────────────────
const PHOTO_KEY = "sa_profile_photos";

export const getProfilePhotos = async (): Promise<Record<string, string>> => {
  const raw = await AsyncStorage.getItem(PHOTO_KEY);
  return raw ? JSON.parse(raw) : {};
};

export const setProfilePhoto = async (userId: string, uri: string) => {
  const photos = await getProfilePhotos();
  photos[userId] = uri;
  await AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
};

// ─── Profile Bio ────────────────────────────────────────────────
const BIO_KEY = "sa_profile_bios";

export const getProfileBios = async (): Promise<Record<string, string>> => {
  const raw = await AsyncStorage.getItem(BIO_KEY);
  return raw ? JSON.parse(raw) : {};
};

export const setProfileBio = async (userId: string, bio: string) => {
  const bios = await getProfileBios();
  bios[userId] = bio;
  await AsyncStorage.setItem(BIO_KEY, JSON.stringify(bios));
};

// ─── Notifications ──────────────────────────────────────────────
const NOTIF_KEY = "sa_notifications";

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
  const raw = await AsyncStorage.getItem(NOTIF_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const setNotifications = async (items: AppNotification[]) => {
  await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(items));
};

export const addNotification = async (n: Omit<AppNotification, "id" | "read">) => {
  const list = await getNotifications();
  const entry: AppNotification = { ...n, id: Date.now(), read: [] };
  await setNotifications([entry, ...list]);
  return entry;
};

export const markNotificationRead = async (id: number, userEmail: string) => {
  const list = await getNotifications();
  const updated = list.map((n) =>
    n.id === id && !n.read.includes(userEmail) ? { ...n, read: [...n.read, userEmail] } : n
  );
  await setNotifications(updated);
};

// ─── Payment Types (Admin-managed) ─────────────────────────────
const PAY_TYPES_KEY = "sa_payment_types";

export type PaymentType = {
  id: number;
  name: string;
  amount: number;
  period: string;
  description: string;
};

export const getPaymentTypes = async (): Promise<PaymentType[] | null> => {
  const raw = await AsyncStorage.getItem(PAY_TYPES_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setPaymentTypes = async (types: PaymentType[]) => {
  await AsyncStorage.setItem(PAY_TYPES_KEY, JSON.stringify(types));
};

// ─── Payment History (per user) ─────────────────────────────────
const PAY_HIST_KEY = "sa_payment_history";

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
  const raw = await AsyncStorage.getItem(PAY_HIST_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const setPaymentHistory = async (records: PaymentRecord[]) => {
  await AsyncStorage.setItem(PAY_HIST_KEY, JSON.stringify(records));
};

export const addPaymentRecord = async (record: Omit<PaymentRecord, "id">) => {
  const list = await getPaymentHistory();
  const entry: PaymentRecord = { ...record, id: Date.now() };
  await setPaymentHistory([entry, ...list]);
  return entry;
};

// ─── Complaints (persisted) ─────────────────────────────────────
const COMPLAINTS_KEY = "sa_complaints";

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
  const raw = await AsyncStorage.getItem(COMPLAINTS_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setComplaints = async (complaints: ComplaintRecord[]) => {
  await AsyncStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
};

export const addComplaint = async (c: Omit<ComplaintRecord, "id">) => {
  const list = (await getComplaints()) ?? [];
  const entry: ComplaintRecord = { ...c, id: Date.now() };
  await setComplaints([entry, ...list]);
  return entry;
};

export const updateComplaintStatus = async (id: number, status: string, adminNote?: string) => {
  const list = (await getComplaints()) ?? [];
  const updated = list.map((c) =>
    c.id === id ? { ...c, status, ...(adminNote ? { adminNote } : {}) } : c
  );
  await setComplaints(updated);
};
