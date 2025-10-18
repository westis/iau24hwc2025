# Race Updates Feature - Implementation Summary

## Overview

A comprehensive multimedia race updates system that allows administrators to post real-time updates during the race with support for text, audio, video, images, and Instagram embeds. Viewers can filter by category, comment on updates, and receive push notifications for urgent/summary updates.

## Features Implemented

### ✅ Database Schema (3 migrations)

1. **032_extend_race_updates_for_media.sql**
   - Extended `race_updates` table with media fields
   - Added `media_type`, `media_url`, `media_description`
   - Added `category`, `allow_comments`, `comment_count`
   - Indexed for efficient category and media type queries

2. **033_create_race_update_comments.sql**
   - Created `race_update_comments` table
   - Linked to existing `chat_users` for authentication
   - Auto-increment/decrement `comment_count` via trigger
   - RLS policies for user permissions (view all, edit own, admin delete)

3. **034_create_race_update_reads.sql**
   - Created `race_update_reads` table for tracking unread updates
   - Helper functions: `mark_race_updates_as_read()`, `get_unread_race_updates_count()`
   - Intersection Observer pattern for auto-marking as read

### ✅ TypeScript Types

Updated `types/live-race.ts` with:
- `RaceUpdateMediaType`: text, audio, video, image, instagram, text_image
- `RaceUpdateCategory`: summary, urgent, general, interview, team_sweden
- Extended `RaceUpdate` interface with new media fields
- New interfaces: `RaceUpdateComment`, `RaceUpdateRead`
- API response types for comments and unread counts

### ✅ API Routes (5 new endpoints)

1. **GET/POST `/api/race/updates`**
   - GET: Fetch updates with category/media type filtering, pagination
   - POST: Admin create new update with push notification support

2. **GET `/api/race/updates/unread-count`**
   - Returns unread count for authenticated user

3. **POST `/api/race/updates/mark-read`**
   - Mark multiple updates as read (batch operation)

4. **GET/POST `/api/race/updates/[id]/comments`**
   - GET: Fetch comments for an update
   - POST: Add new comment (auth required, banned users blocked)

5. **PATCH/DELETE `/api/race/updates/[id]/comments/[commentId]`**
   - PATCH: Edit own comment
   - DELETE: Delete own comment or admin delete any

### ✅ UI Components

1. **LiveNavigation** (updated)
   - Added "Updates" tab with unread badge
   - Real-time polling every 30 seconds for unread count
   - Badge displays count (max 99+)

2. **RaceUpdateCard** (`components/live/RaceUpdateCard.tsx`)
   - Displays updates with all media types:
     - **Text**: Rich text display
     - **Audio**: HTML5 audio player
     - **Video**: HTML5 video or YouTube/Vimeo embed
     - **Image/Text+Image**: Responsive image with lightbox
     - **Instagram**: Link to Instagram (future: oEmbed embed)
   - Category badges with color coding
   - Expandable comments section
   - Intersection Observer for auto-marking as read
   - Full comment CRUD operations

3. **RaceUpdatesFeed** (`app/live/updates/page.tsx`)
   - Category filter tabs (All, Urgent, Summary, Interview, Team Sweden, General)
   - Unread count badge for authenticated users
   - "New updates available" banner
   - Automatic polling every 15 seconds
   - Responsive grid layout
   - Loading states and error handling

4. **Admin Interface** (`app/admin/race-updates/page.tsx`)
   - Streamlined posting workflow
   - Category selection with visual badges
   - Media type tabs (Text, Image, Audio, Video, Instagram)
   - File upload with drag-drop support
   - Bilingual content (English + Swedish)
   - Push notification toggle for urgent/summary
   - Comments enable/disable toggle
   - Recent uploads preview (future enhancement)

### ✅ Real-Time Features

1. **Unread Tracking**
   - Intersection Observer marks updates as read when scrolled into view
   - Per-user read state stored in database
   - Badge updates in real-time

2. **Live Updates**
   - Polls API every 15 seconds
   - Shows "New updates available" banner
   - Smooth scroll to top on click

3. **Push Notifications** (integrated with existing OneSignal)
   - Automatic push for urgent/summary categories (when enabled)
   - Deep links to `/live/updates#{update_id}`
   - Notification format: "Race Update: {category}" + content preview

### ✅ Internationalization

Added translations to `lib/i18n/translations/`:
- Swedish (`sv.ts`): Uppdateringar, Brådskande, Sammanfattning, etc.
- English (`en.ts`): Updates, Urgent, Summary, etc.

## User Flows

### Admin Flow: Post Audio Update
1. Navigate to `/admin/race-updates`
2. Select category: "Summary"
3. Click "Audio" tab
4. Upload 2-minute Zoom recording (or paste URL)
5. Add text description
6. Toggle "Send push notification"
7. Click "Post Update"
8. Update appears in feed + push sent

### Viewer Flow: Browse Updates
1. Click "Updates" tab (see badge "3 unread")
2. Filter to "Summary" only
3. See new hourly summary with audio
4. Play audio while browsing
5. Scroll down → updates auto-marked as read
6. Add comment: "Great update!"
7. Badge updates to "0 unread"

## Technical Architecture

### Database Design
```
race_updates (extended)
├── id (PK)
├── race_id (FK → race_info)
├── content, content_sv
├── update_type, priority
├── category ✨ NEW
├── media_type, media_url, media_description ✨ NEW
├── allow_comments, comment_count ✨ NEW
├── related_bibs[], related_countries[]
└── timestamp, created_at

race_update_comments ✨ NEW
├── id (PK)
├── update_id (FK → race_updates)
├── user_id (FK → chat_users)
├── comment
└── created_at, updated_at

race_update_reads ✨ NEW
├── user_id (FK → chat_users) \
├── update_id (FK → race_updates) / → Composite PK
└── read_at
```

### Component Hierarchy
```
/live/updates (page)
├── LiveNavigation (with badge)
├── Category filters
├── New updates banner
└── RaceUpdateCard[] (feed)
    ├── Media display (audio/video/image/instagram)
    ├── Content text
    └── Comments section
        ├── Comment form (if authenticated)
        └── Comment list (expandable)
```

### State Management
- **Unread Count**: Polled every 30s, stored in LiveNavigation state
- **Updates Feed**: Polled every 15s, stored in page state
- **Read Tracking**: Intersection Observer → API call → local state update
- **Comments**: Fetched on-demand, optimistic UI updates

## Media Handling

### Supported Types
1. **Text**: Plain text or markdown
2. **Audio**: MP3, WAV, OGG → Vercel Blob or external URL
3. **Video**: MP4, WebM → Vercel Blob, YouTube, Vimeo
4. **Image**: JPEG, PNG, GIF, WebP → Vercel Blob
5. **Instagram**: Embed URL (link for now, oEmbed future)
6. **Text + Image**: Combined display

### Upload Flow
1. Admin selects file → uploads to Vercel Blob
2. Blob URL stored in `media_url`
3. Viewer fetches media directly from Blob/CDN

## Performance Optimizations

1. **Polling Strategy**
   - Unread count: 30s interval (lightweight query)
   - Updates feed: 15s interval (with cache headers)
   - Comments: On-demand only

2. **Database Indexes**
   - Category + timestamp (for filtered feeds)
   - Media type (for future analytics)
   - User + update (for read tracking)
   - GIN indexes on arrays (bibs, countries)

3. **Caching**
   - Updates feed: 10s browser cache
   - Unread count: 10s browser cache
   - Comments: 5s browser cache

4. **Lazy Loading**
   - Comments loaded only when expanded
   - Images lazy-loaded with `loading="lazy"`
   - Intersection Observer prevents unnecessary reads

## Security

1. **Authentication**
   - Admin routes protected by existing auth system
   - Comments require chat_users account
   - Banned users blocked from commenting

2. **Authorization**
   - Users can edit/delete own comments
   - Admins can delete any comment
   - Read-only access to updates for public

3. **Input Validation**
   - Comment length: max 5000 chars
   - Content length: max 2000 chars
   - File type validation for uploads
   - SQL injection protected (parameterized queries)

4. **RLS Policies**
   - Public read access to all updates
   - Authenticated write for own comments
   - Admin override for moderation

## Future Enhancements

1. **Rich Media**
   - Instagram oEmbed integration
   - Audio waveform visualization
   - Image lightbox gallery
   - Video thumbnail generation

2. **Advanced Features**
   - Scheduled posts
   - Draft mode
   - Edit/delete updates
   - Update analytics (views, engagement)
   - Emoji reactions

3. **Notifications**
   - Email notifications for critical updates
   - Web push preferences (per category)
   - SMS for urgent updates

4. **Moderation**
   - Comment reporting
   - Auto-moderation rules
   - Pin/feature important updates

## Testing Checklist

- [x] Database migrations run without errors
- [x] TypeScript types compile correctly
- [x] API endpoints handle errors gracefully
- [x] Admin can create text update
- [x] Admin can upload and post image
- [x] Admin can upload and post audio
- [x] Admin can embed video (YouTube URL)
- [x] Viewer can filter by category
- [x] Viewer can comment on update
- [x] Unread badge updates in real-time
- [x] Intersection Observer marks as read
- [x] Push notification triggers (urgent/summary)
- [x] Translations display correctly (EN/SV)
- [x] Mobile responsive design works
- [x] RLS policies prevent unauthorized access

## File Locations

### Database
- `migrations/032_extend_race_updates_for_media.sql`
- `migrations/033_create_race_update_comments.sql`
- `migrations/034_create_race_update_reads.sql`

### Types
- `types/live-race.ts` (extended)

### API Routes
- `app/api/race/updates/route.ts` (GET, POST)
- `app/api/race/updates/unread-count/route.ts`
- `app/api/race/updates/mark-read/route.ts`
- `app/api/race/updates/[id]/comments/route.ts`
- `app/api/race/updates/[id]/comments/[commentId]/route.ts`

### Components
- `components/live/LiveNavigation.tsx` (updated)
- `components/live/RaceUpdateCard.tsx` (new)

### Pages
- `app/live/updates/page.tsx` (new)
- `app/admin/race-updates/page.tsx` (new)

### Translations
- `lib/i18n/translations/sv.ts` (updated)
- `lib/i18n/translations/en.ts` (updated)

## Known Limitations

1. **Instagram Embeds**: Currently displays as link only (oEmbed integration pending)
2. **File Size**: No explicit file size limits (relies on Vercel Blob limits)
3. **Media Formats**: Limited to common formats (no exotic codecs)
4. **Batch Operations**: Can't bulk-delete or bulk-edit updates
5. **Search**: No search functionality within updates (future enhancement)

## Deployment Notes

1. Run database migrations in order (032, 033, 034)
2. Ensure Vercel Blob storage is configured
3. Verify OneSignal integration is active
4. Test push notifications before race day
5. Monitor Supabase RLS policies are active
6. Check file upload size limits

## Support & Troubleshooting

**Q: Updates not appearing in feed?**
A: Check if race is marked as active in `race_info` table

**Q: Push notifications not sending?**
A: Verify OneSignal API key and check `/api/notifications/send` logs

**Q: Comments not saving?**
A: Ensure user has `chat_users` account and is not banned

**Q: Unread count not updating?**
A: Clear browser cache and verify `/api/race/updates/unread-count` endpoint

**Q: Media upload failing?**
A: Check Vercel Blob configuration and file size limits

---

**Implementation Date**: 2025-01-18
**Version**: 1.0.0
**Status**: ✅ Production Ready
**Estimated Development Time**: 4-5 hours
**Lines of Code**: ~2,000
