# YouMind-style Image Studio

A Next.js App Router scaffold for a prompt-first image generation product, designed around the YouMind-inspired workspace spec in [YOUMIND_UI_COPY_SPEC.md](./YOUMIND_UI_COPY_SPEC.md).

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase SSR helpers
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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
HOLO_API_BASE_URL=https://api.dealonhorizon.us
HOLO_API_KEY=
```

Without env values, the UI still renders and shows a pending Supabase badge in the detail panel.

## Supabase Auth setup

This project uses email magic links.

In Supabase Auth, add redirect URLs for:

- `http://localhost:3000/auth/callback`
- your Vercel production domain, for example `https://your-app.vercel.app/auth/callback`
- any custom production domain you plan to use

If the redirect URL is missing, the app will land on `/auth/error` after email verification.

## Vercel deployment

Set these environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `HOLO_API_BASE_URL`
- `HOLO_API_KEY`

The project is Bun-compatible and already includes `bun.lock`, so Vercel can use Bun directly.

## Supabase Storage

To persist generated images beyond HOLO's temporary 24-hour file window, run the storage migration:

- [supabase/migrations/20260525_000002_create_generated_images_bucket.sql](./supabase/migrations/20260525_000002_create_generated_images_bucket.sql)

This creates a private bucket named `generated-images` and owner-scoped storage policies.

## Current scope

- YouMind-style `Create` workspace shell
- Sidebar, masonry-style asset feed, persistent composer, detail panel
- Supabase browser/server client helpers
- Proxy hook for auth session refresh
- Real HOLO image submission routes at `/api/generations` and `/api/generations/[taskId]`
- Email magic-link sign-in and auth callback flow
- Draft SQL schema in `supabase/migrations/`

## Next implementation steps

1. Wire Supabase auth and user profile state
2. Apply the Supabase migration and connect generation history persistence
3. Confirm the final `nanobanana` model SKU mapping and replace the fallback
4. Store completed files in Supabase Storage for private access and long-term retention
