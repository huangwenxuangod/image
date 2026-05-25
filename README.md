# Board Chat Image Studio

Chat-first image generation workspace built with Next.js, Clerk, Supabase, and the HOLO queue API.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Clerk authentication
- Supabase Postgres + Storage
- Bun

## Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create `.env.local` from `.env.example` and fill in:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_GENERATED_BUCKET=generated-images
HOLO_API_BASE_URL=https://api.dealonhorizon.us
HOLO_API_KEY=
```

Required behavior by env:

- Clerk handles sign-in and sign-up.
- Supabase is used only for database and storage persistence.
- `SUPABASE_SERVICE_ROLE_KEY` is required for generation history writes and Storage uploads.
- Without Supabase envs, the UI can still render, but persistence and image archiving are disabled.

## Clerk setup

In Clerk:

1. Create an application.
2. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Set the app URLs if Clerk asks for them:
   - local: `http://localhost:3000`
   - production: your Vercel domain
4. Ensure sign-in and sign-up routes are:
   - `/sign-in`
   - `/sign-up`

## Supabase setup

Run these SQL migrations in order:

1. [supabase/migrations/20260524_000001_create_image_studio.sql](./supabase/migrations/20260524_000001_create_image_studio.sql)
2. [supabase/migrations/20260525_000002_create_generated_images_bucket.sql](./supabase/migrations/20260525_000002_create_generated_images_bucket.sql)
3. [supabase/migrations/20260525_000003_migrate_to_clerk_auth.sql](./supabase/migrations/20260525_000003_migrate_to_clerk_auth.sql)

What these do:

- create generation tables
- create the private `generated-images` bucket
- migrate user identity columns from `auth.users` UUIDs to Clerk string IDs

For app env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Vercel deployment

Set these environment variables in Vercel:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_GENERATED_BUCKET`
- `HOLO_API_BASE_URL`
- `HOLO_API_KEY`

If you installed Clerk through the Vercel Marketplace, the Clerk keys can be auto-provisioned.

## Routes

- `/sign-in`
- `/sign-up`
- `/board`
- `/api/generations`
- `/api/generations/[taskId]`

## Current scope

- Clerk-authenticated board workspace
- chat-first generation flow
- HOLO task submission and polling
- Supabase persistence for generations and images
- automatic Storage archiving after image completion
- board concept image on the auth screen

## Remaining product work

1. Replace the placeholder board visuals with the final YouMind-like chat workspace.
2. Add Collections and Favorites write paths.
3. Add richer workspace inspector states for selected image assets.
