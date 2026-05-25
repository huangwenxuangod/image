drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "collections_select_own" on public.collections;
drop policy if exists "collections_insert_own" on public.collections;
drop policy if exists "collections_update_own" on public.collections;
drop policy if exists "collections_delete_own" on public.collections;

drop policy if exists "generations_select_own" on public.generations;
drop policy if exists "generations_insert_own" on public.generations;
drop policy if exists "generations_update_own" on public.generations;

drop policy if exists "generation_images_select_own" on public.generation_images;
drop policy if exists "generation_images_insert_own" on public.generation_images;
drop policy if exists "generation_images_update_own" on public.generation_images;

alter table if exists public.profiles
  drop constraint if exists profiles_id_fkey;

alter table if exists public.collections
  drop constraint if exists collections_user_id_fkey;

alter table if exists public.generations
  drop constraint if exists generations_user_id_fkey;

alter table if exists public.generation_images
  drop constraint if exists generation_images_user_id_fkey;

alter table public.profiles
  alter column id type text using id::text;

alter table public.collections
  alter column user_id type text using user_id::text;

alter table public.generations
  alter column user_id type text using user_id::text;

alter table public.generation_images
  alter column user_id type text using user_id::text;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid()::text = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid()::text = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid()::text = id)
with check (auth.uid()::text = id);

create policy "collections_select_own"
on public.collections
for select
to authenticated
using (auth.uid()::text = user_id);

create policy "collections_insert_own"
on public.collections
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "collections_update_own"
on public.collections
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "collections_delete_own"
on public.collections
for delete
to authenticated
using (auth.uid()::text = user_id);

create policy "generations_select_own"
on public.generations
for select
to authenticated
using (auth.uid()::text = user_id);

create policy "generations_insert_own"
on public.generations
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "generations_update_own"
on public.generations
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "generation_images_select_own"
on public.generation_images
for select
to authenticated
using (auth.uid()::text = user_id);

create policy "generation_images_insert_own"
on public.generation_images
for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "generation_images_update_own"
on public.generation_images
for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
