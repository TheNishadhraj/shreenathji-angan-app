-- Allow anyone to read from profile-photos bucket
create policy "Public read profile photos"
  on storage.objects for select to anon
  using (bucket_id = 'profile-photos');

-- Allow anyone to upload to profile-photos bucket
create policy "Anon upload profile photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'profile-photos');

-- Allow anyone to replace (update) objects in profile-photos bucket
create policy "Anon update profile photos"
  on storage.objects for update to anon
  using (bucket_id = 'profile-photos');
