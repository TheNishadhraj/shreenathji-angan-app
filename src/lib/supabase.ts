import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Fallback values for when .env is not available (e.g. EAS builds read from eas env:create)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://bsiwpipthimrweomevpy.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaXdwaXB0aGltcndlb21ldnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTU3NDIsImV4cCI6MjA4OTEzMTc0Mn0.qv7lpLgqD-Mq9mAlBJIMlKOgWqMMpJ2irdIws5ogWLQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
