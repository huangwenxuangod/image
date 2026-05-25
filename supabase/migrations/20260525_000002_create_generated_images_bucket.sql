insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'generated-images',
  'generated-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "generated_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generated_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generated_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "generated_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
