-- ────────────────────────────────────────────────────────────────
-- OTP Codes table — stores server-generated OTP codes
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS otp_codes (
  id        bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  target    text NOT NULL,                       -- phone or email
  code      text NOT NULL,                       -- 6-digit OTP
  action    text NOT NULL DEFAULT 'verify',      -- register, forgot, etc.
  expires_at timestamptz NOT NULL,
  verified  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_target_action ON otp_codes(target, action);

-- RLS: allow anon to insert/select/update (edge function uses service role)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "otp_insert" ON otp_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "otp_select" ON otp_codes FOR SELECT USING (true);
CREATE POLICY "otp_update" ON otp_codes FOR UPDATE USING (true);

-- Auto-delete expired OTPs older than 1 hour (cleanup via pg_cron or manual)
-- For now, the verify function handles expiry checks.

-- ── RPC: verify_otp ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_otp(p_target text, p_code text, p_action text DEFAULT 'verify')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id bigint;
BEGIN
  SELECT id INTO v_id
  FROM otp_codes
  WHERE target   = lower(p_target)
    AND code     = p_code
    AND action   = p_action
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE otp_codes SET verified = true WHERE id = v_id;
  -- Cleanup old OTPs for this target+action
  DELETE FROM otp_codes
  WHERE target = lower(p_target)
    AND action = p_action
    AND id <> v_id;

  RETURN true;
END;
$$;
