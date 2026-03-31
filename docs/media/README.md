# Media System

This document covers the video, shorts, and music subsystems — upload, playback, storage, and the related server actions and hooks.

## Overview

s2 supports three types of media content:

- **Videos** — Standard video uploads with thumbnails, categories, and view counts
- **Shorts** — Vertical short-form videos (flagged via `is_short` on the videos table)
- **Music/Audio** — Audio tracks with thumbnails, descriptions, and listen counts

All media files are stored in **Supabase Storage** and metadata is persisted in the `videos` and `audios` tables.

## Video System

### Upload Flow

1. User navigates to `/upload`
2. The upload form (`components/media/`) handles file selection and metadata input
3. Video file is uploaded to Supabase Storage
4. A row is inserted into the `videos` table with the storage path, title, visibility, etc.
5. The `MediaManager` provides management of uploaded media

### Data Model

Videos are stored in the `videos` table with fields for `video_path`, `thumbnail_path`, `visibility` (public/private/unlisted), `category`, `views`, and `is_short`.

### Server Actions

**File:** `serverActions/GetVideoDetails.ts`

| Action | Description |
|--------|-------------|
| `GetVideoDetails(id, time_allowed?)` | Fetches a single video by ID. Respects visibility — private videos only visible to the owner. Returns formatted `VideoInfoProps`. |
| `GetPublicVideos(time_allowed?)` | Fetches all public videos, formatted for the feed. |
| `GetVideoSidebarVideos(excludeVideoId, time_allowed?)` | Returns trending (by views) and newest videos for the sidebar on the watch page. Excludes the currently-playing video. |

The `time_allowed` parameter controls signed URL expiry for Supabase Storage.

### Video Formatting

The `converttoVideo` function (`lib/videos/data-to-video-format.ts`) transforms raw database rows into `VideoInfoProps` objects with:
- Signed storage URLs for video and thumbnail
- Creator profile data (username, avatar)
- Formatted timestamps

## Shorts System

Shorts are regular videos with `is_short = true`. They use a dedicated vertical feed UI with swipe navigation.

### Server Action

**File:** `serverActions/GetShortsData.ts`

`GetShortsData()` returns `ShortVideoData[]` with extra social data:
- `likes` — total like count
- `is_liked` — whether the current user liked the short
- `is_subscribed` — whether the current user follows the creator
- `subscribers` — creator's total subscriber count

This is done by joining `video_likes` and `subscribers` data in a single server action.

### Client Hook

**File:** `hooks/use-shorts.ts`

`useShorts(initialData?)` provides client-side shorts loading:
- Accepts optional server-rendered initial data to avoid loading flash
- Falls back to client-side Supabase query if no initial data
- Returns `{ shorts, isLoading, user }`
- Uses Preact Signals for reactive updates

### Shorts Components

The shorts feed lives in `components/video/` and includes:
- Scrolling vertical feed with snap behavior
- Playback controls and overlay
- Like, subscribe, and share actions

## Music/Audio System

### Upload Flow

Audio is uploaded similarly to videos via `/upload/music`. Files go to Supabase Storage and metadata goes to the `audios` table.

### Server Actions

**File:** `serverActions/GetAudioDetails.ts`

| Action | Description |
|--------|-------------|
| `GetAudioDetails(id, time_allowed?)` | Fetches a single audio track by ID. Returns `AudioInfoProps`. |
| `GetPublicAudios(time_allowed?)` | Fetches all public audio tracks. |
| `updateAudioDetails(id, payload)` | Updates title, description, visibility, or thumbnail. Owner-only with auth check. |

### Audio Formatting

The `convertToAudio` function (`lib/audios/data-to-audio-format.ts`) transforms raw rows into `AudioInfoProps` with signed URLs and creator data.

### Music Components

Music UI lives in `components/music/` with:
- Music tiles for browsing
- Edit dialog for updating metadata

## Visibility Controls

Both videos and audio support three visibility levels:

| Visibility | Behavior |
|------------|----------|
| `public` | Visible to everyone, appears in feeds and search |
| `private` | Only visible to the owner |
| `unlisted` | Accessible by direct link, not shown in feeds |

RLS policies enforce these rules at the database level.

## Media Route Teardown

The `MediaRouteTeardown` component (`components/media/`) runs in the root layout's `<Suspense>` boundary. It cleans up media-related state (e.g., active uploads, playback state) when the user navigates away from upload routes.

## Supabase Storage

Media files are stored in Supabase Storage buckets. Access is controlled by:
- **Signed URLs** with configurable expiry (`time_allowed` parameter, defaulting to 30s for video and 60s for audio)
- **RLS policies** on the storage bucket for upload/delete operations

The `next.config.ts` includes `remotePatterns` for Supabase Storage domains to enable Next.js image optimization for thumbnails.

## Related Files

| File | Purpose |
|------|---------|
| `serverActions/GetVideoDetails.ts` | Video server actions |
| `serverActions/GetShortsData.ts` | Shorts server action |
| `serverActions/GetAudioDetails.ts` | Audio server actions |
| `hooks/use-shorts.ts` | Client-side shorts loading hook |
| `lib/videos/data-to-video-format.ts` | Video row → VideoInfoProps formatter |
| `lib/audios/data-to-audio-format.ts` | Audio row → AudioInfoProps formatter |
| `components/video/` | Video cards, shorts feed, playback controls |
| `components/music/` | Music tiles and edit dialog |
| `components/media/` | Upload forms, media manager, route teardown |
| `app/upload/` | Upload page and music upload subpage |
| `app/video/[videoId]/` | Video watch page |
| `app/shorts/` | Shorts feed page |
| `app/music/` | Music browse page |
