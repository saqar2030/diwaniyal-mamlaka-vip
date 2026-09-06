create policy "media read" on storage.objects for select to authenticated, anon
  using (bucket_id = 'media');
create policy "media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "media update own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);