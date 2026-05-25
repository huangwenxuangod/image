create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  provider text not null check (provider in ('image2', 'nanobanana')),
  remote_model text not null,
  aspect_ratio text not null check (aspect_ratio in ('1:1', '4:5', '16:9')),
  image_count integer not null check (image_count in (1, 2, 4)),
  status text not null check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  latest_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_images (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  holo_task_id text not null unique,
  source_url text,
  storage_path text,
  file_ext text,
  width integer,
  height integer,
  is_favorite boolean not null default false,
  status text not null check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  latest_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collections_user_id_idx on public.collections(user_id);
create index if not exists generations_user_id_idx on public.generations(user_id, created_at desc);
create index if not exists generation_images_user_id_idx on public.generation_images(user_id, created_at desc);
create index if not exists generation_images_collection_id_idx on public.generation_images(collection_id);

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.generations enable row level security;
alter table public.generation_images enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "collections_select_own"
on public.collections
for select
to authenticated
using (auth.uid() = user_id);

create policy "collections_insert_own"
on public.collections
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "collections_update_own"
on public.collections
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "collections_delete_own"
on public.collections
for delete
to authenticated
using (auth.uid() = user_id);

create policy "generations_select_own"
on public.generations
for select
to authenticated
using (auth.uid() = user_id);

create policy "generations_insert_own"
on public.generations
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "generations_update_own"
on public.generations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "generation_images_select_own"
on public.generation_images
for select
to authenticated
using (auth.uid() = user_id);

create policy "generation_images_insert_own"
on public.generation_images
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "generation_images_update_own"
on public.generation_images
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
