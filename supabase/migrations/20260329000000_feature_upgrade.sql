-- ============================================================
--  MIGRATION 20260329000000 — Feature Upgrade
--  Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add image_uri column to events table (for photo/video posts)
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_uri text;

-- 2. Add payment_status column to bookings (shows payment after approval)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Unpaid';

-- 3. Add post_type column to events for explicit category tracking
-- (already handled by category column — no change needed)

-- 4. Ensure profile-photos storage bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Add storage policy for event images (same bucket, different path)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anon delete photos'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon delete photos" ON storage.objects FOR DELETE TO anon USING (bucket_id = ''profile-photos'')';
  END IF;
END $$;
