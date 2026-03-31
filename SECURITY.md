# Security Hardening — Shreenathji Angan Mobile App

## Summary of Protections

### 1. Credential & Secret Management
- **No hardcoded secrets** — Supabase URL and anon key loaded exclusively from environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- **HTTPS enforcement** — App throws at startup if Supabase URL is not `https://`
- **152 plaintext passwords removed** from `societyData.ts`; users must use password overrides (Supabase) or Forgot Password flow

### 2. Password Security
- **Salted SHA-256** — Every password is hashed with a unique 16-byte random salt: `$sha256s$<salt>$<hash>`
- **Legacy migration** — Old unsalted `$sha256$` hashes are auto-detected; `verifyPassword` returns `needsMigration` flag
- **Password policy** — Minimum 8 characters, at least 1 letter + 1 digit
- **Strength validation** enforced on registration, password reset, and profile password change

### 3. Secure Storage
- **Sessions** stored in `expo-secure-store` (iOS Keychain / Android Keystore) with **7-day TTL** and auto-expiry
- **Biometric preferences** stored in SecureStore (not AsyncStorage)
- **Rate-limit state** persisted in SecureStore (survives app restart)
- **Supabase auth tokens** stored via SecureStore adapter (not AsyncStorage)

### 4. Authentication Hardening
- **Exponential backoff** rate limiting: 30s → 60s → 120s → 300s → 600s (max 30min), persisted in SecureStore
- **OTP codes** never exposed to client in production (`__DEV__` guard)
- **Server-side OTP** — `otp_codes` Supabase table + Edge Function (`send-otp`)
- **Email validation** via regex on registration
- **Null password check** — users without stored passwords directed to Forgot Password

### 5. Input Validation & Injection Prevention
All user-facing TextInputs have `maxLength` constraints:

| Field | Max Length |
|-------|-----------|
| Name | 50 |
| Email | 120 |
| Phone | 15 |
| Password | 128 |
| Bio | 120 |
| Complaint Title | 100 |
| Complaint Description | 500 |
| Notification Title | 100 |
| Notification Message | 500 |
| Comment | 300 |
| Post Text | 500 |
| Poll Title | 100 |
| Poll Description | 300 |
| Poll Option | 100 |
| Booking Purpose | 150 |
| Admin Note | 500 |
| Payment Type Name | 50 |
| Payment Type Description | 200 |
| Payment Type Period | 30 |
| News Title | 100 |
| News Description | 1000 |

- **`sanitizeText()`** strips HTML tags and enforces length limits on all form submissions
- Applied in: AuthScreen, ProfileScreen, ComplaintsScreen, AdminScreen, BookingScreen, EventsScreen, PaymentsScreen

### 6. Device Integrity (RASP)
- **Emulator/simulator detection** via `expo-device` — warns on non-physical devices in production
- **App version/build tracking** via `expo-application`

### 7. Network Security
- **HTTPS-only** Supabase connection enforced at startup
- **iOS ATS** (App Transport Security) blocks plain HTTP by default
- **Android** network security config via EAS Build restricts cleartext traffic
- **SSRF guards** on file uploads (`setProfilePhoto`, `uploadEventImage`) — reject non-`file://` URIs

### 8. Secure Logging
- **All `console.*` calls** wrapped in `__DEV__` guards — zero log output in production
- **No PII** in log messages (error messages only, no user data)

---

## Validation Checklist

### Manual Testing Steps

1. **Missing env vars** — Remove `EXPO_PUBLIC_SUPABASE_URL` from `.env`; app should throw on startup
2. **HTTP URL** — Set URL to `http://...`; app should throw "must use HTTPS"
3. **Weak password** — Try registering with "abc123"; should reject (needs 8+ chars, letters + digits)
4. **Rate limiting** — Enter wrong password 5 times; verify lockout message with countdown timer
5. **Rate limit persistence** — Force-quit app during lockout, reopen; lockout should still be active
6. **OTP in production** — Trigger OTP flow; alert should say "Check your registered email" (no code shown)
7. **Session expiry** — Set session, wait 7 days (or manually edit SecureStore TTL); session should auto-clear
8. **Input length** — Try pasting 1000+ chars in any TextInput; verify it's capped at `maxLength`
9. **HTML injection** — Submit `<script>alert(1)</script>` as a complaint title; verify tags are stripped
10. **Emulator warning** — Run production build on emulator; should see "Security Warning" alert
11. **Biometric auth** — Verify biometric login works and preference persists across app restarts
12. **Password change** — Verify current password validation, new password strength check, and successful hash update

### Automated Checks

```bash
# TypeScript validation — must pass with zero errors
npx tsc --noEmit

# Search for hardcoded secrets
grep -rn "eyJ" src/  # Should return zero matches
grep -rn "supabase.co" src/lib/  # Should only appear in env var reference

# Search for unguarded console statements  
grep -rn "console\." src/ | grep -v "__DEV__"  # Should return zero matches

# Search for remaining plaintext passwords
grep -rn "password:" src/data/  # Should return zero matches
```

---

## Architecture Notes

- **`src/utils/security.ts`** — Central security module (hashing, sessions, rate limiting, validation, device integrity)
- **`src/utils/storage.ts`** — Wraps security.ts; backward-compatible `setSession/getSession/clearSession` API
- **`src/lib/supabase.ts`** — Supabase client with SecureStore adapter and env-only config
