# HOLO API Integration Notes

Source: user-provided HOLO API reference dated 2026-05-24, plus live verification against:

- `GET https://api.dealonhorizon.us/v1/models`
- `GET https://api.dealonhorizon.us/health`
- `GET https://api.dealonhorizon.us/me`

## Auth

Use either:

```http
Authorization: Bearer <HOLO_API_KEY>
```

or:

```http
X-API-Key: <HOLO_API_KEY>
```

## Core endpoints used in this project

- `POST /v1/generate`
- `GET /v1/tasks/{task_id}`
- `GET /v1/models`
- `GET /health`
- `GET /me`

## Integration decisions

This project only supports text-to-image for now.

- Provider `image2` maps to the `GPT-images2` family.
- Provider `nanobanana` is currently treated as a product alias and maps to Gemini image SKUs, because there is no `nanobanana` model ID in the live `/v1/models` response.

## Important discrepancy found

The user-provided reference lists:

- `GPT-images2 2:3-2K`

But the live `GET /v1/models` response currently exposes:

- `GPT-images2 2:3`
- `GPT-images2 3:4`
- `GPT-images2 3:4-2K`

and does **not** expose `GPT-images2 2:3-2K`.

That means a request using `GPT-images2 2:3-2K` will fail with an invalid model error.

## Current default model mapping

### image2

- `1:1` → `GPT-images2 1:1`
- `4:5` → `GPT-images2 2:3`
- `16:9` → `GPT-images2 16:9-2K`

### nanobanana

- `1:1` → `gemini-3.1-flash-image-square`
- `4:5` → `gemini-3.1-flash-image-three-four`
- `16:9` → `gemini-3.1-flash-image-landscape`

## Why previous model errors happened

Most likely cause:

1. The route resolved `image2 + 4:5` to `GPT-images2 2:3-2K`
2. HOLO live model catalog did not contain that ID
3. HOLO returned a `400` invalid model response

Secondary possible cause:

- The user expected `nanobanana` to be a native HOLO model name, but it is not present in `/v1/models`

## Routing system in this app

The app now uses:

- `POST /api/generations` to submit one or more image tasks
- `GET /api/generations/{taskId}` to query task status
- `GET /api/holo/models` to expose live model catalog
- `GET /api/holo/health` to expose upstream health

## Next recommended step

If you want `nanobanana` to call a real dedicated upstream model instead of the current Gemini alias, provide the exact live model ID shown by HOLO `/v1/models`, and only the mapping layer needs to change.
