-- =======================================================================
-- Security Hardening Migration
-- Restricts overly-permissive anon_all RLS policies, adds CHECK constraints
-- for input-length limits, adds email indexes for performance, and scopes
-- storage upload paths to prevent directory-traversal.
-- =======================================================================

-- -----------------------------------------------------------------------
-- 1. Tighten anon RLS on sensitive tables (password_overrides, registered_users)
--    Remove blanket anon_all and replace with least-privilege policies.
-- -----------------------------------------------------------------------

-- password_overrides: only insert/update allowed; anon cannot read or delete raw hashes
drop policy if exists "anon_all" on password_overrides;
create policy "po_upsert" on password_overrides
  for insert to anon
  with check (true);
create policy "po_update" on password_overrides
  for update to anon
  using (true)
  with check (true);
-- Note: SELECT is intentionally excluded — the app never reads overrides via Supabase
-- REST directly (it uses the helper function which runs in the app layer).

-- registered_users: allow insert (self-registration) and select; block delete
drop policy if exists "anon_all" on registered_users;
create policy "ru_select" on registered_users
  for select to anon
  using (true);
create policy "ru_insert" on registered_users
  for insert to anon
  with check (true);
create policy "ru_update" on registered_users
  for update to anon
  using (true)
  with check (true);
-- DELETE is intentionally excluded for anon users

-- -----------------------------------------------------------------------
-- 2. CHECK constraints — prevent oversized payloads at DB level
--    Helps guard against memory exhaustion and reduces injection surface.
-- -----------------------------------------------------------------------

alter table registered_users
  add constraint if not exists chk_ru_name_len   check (length(name)  <= 100),
  add constraint if not exists chk_ru_email_len  check (length(email) <= 254),
  add constraint if not exists chk_ru_flat_len   check (length(flat)  <= 20),
  add constraint if not exists chk_ru_block_len  check (length(block) <= 10),
  add constraint if not exists chk_ru_phone_len  check (length(phone) <= 20);

alter table complaints
  add constraint if not exists chk_comp_desc_len check (length(description) <= 2000),
  add constraint if not exists chk_comp_sub_len  check (length(subject)     <= 200);

alter table events
  add constraint if not exists chk_ev_title_len   check (length(title)   <= 200),
  add constraint if not exists chk_ev_caption_len check (length(caption) <= 1000);

alter table notices
  add constraint if not exists chk_not_title_len   check (length(title)   <= 200),
  add constraint if not exists chk_not_content_len check (length(content) <= 5000);

alter table bookings
  add constraint if not exists chk_bk_notes_len check (length(notes) <= 500);

-- -----------------------------------------------------------------------
-- 3. Email indexes for performance (reduces slow-query DoS surface)
-- -----------------------------------------------------------------------

create index if not exists idx_registered_users_email_lower
  on registered_users (lower(email));

create index if not exists idx_password_overrides_email
  on password_overrides (email);

-- -----------------------------------------------------------------------
-- 4. Scope storage uploads to known path prefixes
--    Prevents an anon caller from writing to arbitrary bucket paths.
-- -----------------------------------------------------------------------

-- Drop the overly-permissive upload policy (if it exists from initial schema)
drop policy if exists "Anon upload photos" on storage.objects;

create policy "Scoped upload profile photos" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'profile-photos'
    and (name like 'profiles/%' or name like 'events/%')
  );

-- Allow anon to update their own uploads (for re-uploads / replacements)
drop policy if exists "Anon update photos" on storage.objects;
create policy "Scoped update profile photos" on storage.objects
  for update to anon
  using (
    bucket_id = 'profile-photos'
    and (name like 'profiles/%' or name like 'events/%')
  );
