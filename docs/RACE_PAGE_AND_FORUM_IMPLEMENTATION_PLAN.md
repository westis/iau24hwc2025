# Race Page, Navigation Restructure, and Forum Implementation Plan

## Overview

This document outlines the implementation plan for:
1. **New "Loppet" (Race) page** - Comprehensive race information
2. **Navigation restructure** - Consolidate Runners and Teams under "Deltagare" (Participants) with tab navigation
3. **Dashboard countdown** - Live countdown to race start
4. **Future: Live Forum** - Modern forum with live threads and user interaction

## Priority Order

### Phase 1: Core Race Features (Immediate)
1. Loppet (Race) page
2. Navigation restructure (Deltagare with tabs)
3. Dashboard countdown

### Phase 2: Community Features (Future)
4. Live forum implementation

---

## Phase 1: Core Race Features

### 1. Loppet (Race) Page

#### 1.1 Current State Analysis

**Existing structure:**
- No dedicated race information page
- Race details scattered across the application
- No central hub for race-related information

**Required information to display:**
- Race name and description
- Start date and time: **2025-10-18 10:00:00**
- Location details
- Course map (image or interactive)
- Link to live results (external)
- Race rules and regulations
- Contact information
- Weather information (optional)
- Accommodation/travel info (optional)

#### 1.2 Database Schema

**New table: `race_info`**
```sql
CREATE TABLE IF NOT EXISTS race_info (
  id SERIAL PRIMARY KEY,

  -- Basic Info
  race_name_en VARCHAR(255) NOT NULL,
  race_name_sv VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_sv TEXT,

  -- Date/Time
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Location
  location_name VARCHAR(255),
  location_address TEXT,
  location_coordinates POINT, -- For map integration

  -- External Links
  live_results_url TEXT,
  registration_url TEXT,
  official_website_url TEXT,

  -- Media
  course_map_url TEXT, -- Supabase Storage URL
  hero_image_url TEXT,

  -- Additional Info
  rules_en TEXT,
  rules_sv TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- SEO/Meta
  meta_description_en TEXT,
  meta_description_sv TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Active race flag
  is_active BOOLEAN DEFAULT true
);

-- Only one race should be active at a time
CREATE UNIQUE INDEX idx_active_race ON race_info (is_active) WHERE is_active = true;
```

**New table: `race_documents`** (for downloadable PDFs, etc.)
```sql
CREATE TABLE IF NOT EXISTS race_documents (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,

  title_en VARCHAR(255) NOT NULL,
  title_sv VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_sv TEXT,

  document_url TEXT NOT NULL, -- Supabase Storage URL
  document_type VARCHAR(50), -- 'map', 'rules', 'schedule', 'info'
  file_size_bytes INTEGER,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.3 API Endpoints

**Create: `/app/api/race/route.ts`**
```typescript
// GET /api/race - Get active race info
// POST /api/race - Create new race (admin only)
// PUT /api/race/[id] - Update race info (admin only)
// DELETE /api/race/[id] - Delete race (admin only)
```

**Create: `/app/api/race/documents/route.ts`**
```typescript
// GET /api/race/documents - Get all documents for active race
// POST /api/race/documents - Upload document (admin only)
// DELETE /api/race/documents/[id] - Delete document (admin only)
```

#### 1.4 Page Structure

**Create: `/app/loppet/page.tsx`**
```
/loppet
  - Hero section with race name and hero image
  - Countdown to race start (prominent)
  - Quick Info Cards:
    - Date & Time
    - Location (with map link)
    - Live Results (prominent button)
  - Course Map section (zoomable image or interactive map)
  - Race Description
  - Rules & Regulations
  - Documents section (downloadable PDFs)
  - Contact Information
  - FAQ section (optional)
```

**Admin page: `/app/admin/race/page.tsx`**
- Form to edit race information
- Upload course map
- Manage documents
- Update live results URL

#### 1.5 Components to Create

**`components/race/RaceCountdown.tsx`**
- Reusable countdown component
- Shows days, hours, minutes, seconds
- Can be used on both Loppet page and Dashboard
- Auto-updates every second
- Shows "Race in progress" or "Race finished" after start time

**`components/race/RaceInfoCard.tsx`**
- Card component for quick info display
- Icon + label + value format
- Examples: Date, Location, Distance, Elevation

**`components/race/CourseMap.tsx`**
- Zoomable course map viewer
- Option to display image or embed interactive map (Mapbox/Google Maps)
- Fullscreen mode

**`components/race/DocumentList.tsx`**
- List of downloadable documents
- File type icons
- File size display
- Download buttons

#### 1.6 Internationalization Updates

**Add to `lib/i18n/translations.ts`:**
```typescript
race: {
  title: 'The Race',
  titleSv: 'Loppet',
  startsIn: 'Race starts in',
  dateTime: 'Date & Time',
  location: 'Location',
  liveResults: 'Live Results',
  courseMap: 'Course Map',
  description: 'Description',
  rules: 'Rules & Regulations',
  documents: 'Documents',
  contact: 'Contact',
  download: 'Download',
  viewLiveResults: 'View Live Results',
  raceInProgress: 'Race in progress!',
  raceFinished: 'Race finished',
  days: 'days',
  hours: 'hours',
  minutes: 'minutes',
  seconds: 'seconds',
}
```

#### 1.7 Navigation Updates

**Update: `components/Navigation.tsx`**
Add "Loppet" / "Race" link to main navigation

---

### 2. Navigation Restructure - Deltagare (Participants)

#### 2.1 Current State Analysis

**Current navigation:**
- `/runners` - Löpare (Runners) page
- `/teams` - Lag (Teams) page
- Separate pages, separate navigation items

**Desired structure:**
```
/deltagare (Participants)
  ├─ Tab: Individuellt (Individual)
  │   ├─ Tab: Herrar (Men)
  │   └─ Tab: Damer (Women)
  └─ Tab: Lag (Teams)
      ├─ Tab: Herrar (Men)
      └─ Tab: Damer (Women)
```

#### 2.2 URL Structure Options

**Option A: Query parameters (Recommended)**
```
/deltagare
/deltagare?view=individual&gender=M
/deltagare?view=individual&gender=W
/deltagare?view=teams&gender=M
/deltagare?view=teams&gender=W
```

**Benefits:**
- Single page, clean URL
- Easy to share specific views
- Simple state management with useSearchParams

**Option B: Nested routes**
```
/deltagare/individual/men
/deltagare/individual/women
/deltagare/teams/men
/deltagare/teams/women
```

**Benefits:**
- More SEO-friendly
- Clearer URL structure

**Recommendation: Option A** - Simpler implementation, matches current pattern

#### 2.3 Page Structure

**Create: `/app/deltagare/page.tsx`**
```typescript
'use client'

interface DeltagarePageProps {
  searchParams: {
    view?: 'individual' | 'teams'
    gender?: 'M' | 'W'
  }
}

export default function DeltagarePage() {
  const [view, setView] = useState<'individual' | 'teams'>('individual')
  const [gender, setGender] = useState<'M' | 'W'>('M')

  return (
    <main>
      {/* View Tabs: Individual / Teams */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="individual">Individuellt</TabsTrigger>
          <TabsTrigger value="teams">Lag</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          {/* Gender Tabs: Men / Women */}
          <Tabs value={gender} onValueChange={setGender}>
            <TabsList>
              <TabsTrigger value="M">Herrar</TabsTrigger>
              <TabsTrigger value="W">Damer</TabsTrigger>
            </TabsList>

            <TabsContent value="M">
              <RunnerTable gender="M" />
            </TabsContent>

            <TabsContent value="W">
              <RunnerTable gender="W" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="teams">
          {/* Gender Tabs: Men / Women */}
          <Tabs value={gender} onValueChange={setGender}>
            <TabsList>
              <TabsTrigger value="M">Herrar</TabsTrigger>
              <TabsTrigger value="W">Damer</TabsTrigger>
            </TabsList>

            <TabsContent value="M">
              <TeamsView gender="M" />
            </TabsContent>

            <TabsContent value="W">
              <TeamsView gender="W" />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </main>
  )
}
```

#### 2.4 Component Refactoring

**Extract from `/app/runners/page.tsx`:**
- `RunnerTable` component (already exists in `components/tables/runner-table.tsx`)
- Filtering logic
- Search functionality

**Extract from `/app/teams/page.tsx`:**
- Team listing/grid component
- Team filtering logic

**Create: `components/participants/ParticipantTabs.tsx`**
- Reusable tabbed interface
- Syncs with URL search params
- Handles view and gender state

#### 2.5 Migration Strategy

1. **Create new `/deltagare` page** with all functionality
2. **Keep existing `/runners` and `/teams` pages** initially
3. **Update navigation** to point to `/deltagare`
4. **Add redirects** from old URLs to new structure:
   ```typescript
   // app/runners/page.tsx
   export default function RunnersRedirect() {
     redirect('/deltagare?view=individual&gender=M')
   }

   // app/teams/page.tsx
   export default function TeamsRedirect() {
     redirect('/deltagare?view=teams')
   }
   ```
5. **Monitor analytics** to ensure no broken links
6. **Remove old pages** after successful transition

#### 2.6 URL Preservation for Deep Links

Ensure existing deep links still work:
- `/runners/[id]` → Keep as-is (individual runner profiles)
- `/teams/[country]` → Keep as-is (team detail pages)

#### 2.7 Internationalization Updates

**Add to `lib/i18n/translations.ts`:**
```typescript
participants: {
  title: 'Participants',
  titleSv: 'Deltagare',
  individual: 'Individual',
  individualSv: 'Individuellt',
  teams: 'Teams',
  teamsSv: 'Lag',
  men: 'Men',
  menSv: 'Herrar',
  women: 'Women',
  womenSv: 'Damer',
}
```

---

### 3. Dashboard Countdown

#### 3.1 Current State Analysis

**Current dashboard:** `/app/page.tsx`
- News feed
- Welcome message
- Basic information

**Required:**
- Prominent countdown to race start (2025-10-18 10:00:00)
- Real-time updates (every second)
- Responsive design
- Should show during different states:
  - Before race: Countdown
  - During race: "Race in progress"
  - After race: Results summary or past race info

#### 3.2 Implementation

**Update: `/app/page.tsx`**
```typescript
import { RaceCountdown } from '@/components/race/RaceCountdown'

export default function HomePage() {
  return (
    <main>
      {/* Hero Section with Countdown */}
      <section className="bg-gradient-to-br from-primary to-primary/70 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            IAU 24H World Championships 2025
          </h1>
          <p className="text-xl mb-8">Malmö, Sweden</p>

          <RaceCountdown
            targetDate="2025-10-18T10:00:00+02:00"
            size="large"
          />
        </div>
      </section>

      {/* Existing content: News, etc. */}
      {/* ... */}
    </main>
  )
}
```

**Create: `components/race/RaceCountdown.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface RaceCountdownProps {
  targetDate: string // ISO 8601 format
  size?: 'small' | 'medium' | 'large'
  showLabels?: boolean
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isStarted: boolean
  isFinished: boolean
}

export function RaceCountdown({
  targetDate,
  size = 'medium',
  showLabels = true
}: RaceCountdownProps) {
  const { t } = useLanguage()
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  if (timeRemaining.isFinished) {
    return (
      <div className="text-center">
        <p className="text-2xl font-bold">{t.race.raceFinished}</p>
      </div>
    )
  }

  if (timeRemaining.isStarted) {
    return (
      <div className="text-center">
        <p className="text-2xl font-bold animate-pulse">{t.race.raceInProgress}</p>
      </div>
    )
  }

  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl md:text-8xl'
  }

  return (
    <div className="text-center">
      {showLabels && (
        <p className="text-lg mb-4">{t.race.startsIn}</p>
      )}

      <div className="flex justify-center gap-4 md:gap-8">
        <TimeUnit value={timeRemaining.days} label={t.race.days} size={size} />
        <TimeUnit value={timeRemaining.hours} label={t.race.hours} size={size} />
        <TimeUnit value={timeRemaining.minutes} label={t.race.minutes} size={size} />
        <TimeUnit value={timeRemaining.seconds} label={t.race.seconds} size={size} />
      </div>
    </div>
  )
}

function TimeUnit({
  value,
  label,
  size
}: {
  value: number
  label: string
  size: 'small' | 'medium' | 'large'
}) {
  const sizeClasses = {
    small: { number: 'text-2xl', label: 'text-xs' },
    medium: { number: 'text-4xl', label: 'text-sm' },
    large: { number: 'text-6xl md:text-8xl', label: 'text-base md:text-xl' }
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`font-bold tabular-nums ${sizeClasses[size].number}`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className={`text-muted-foreground ${sizeClasses[size].label}`}>
        {label}
      </div>
    </div>
  )
}

function calculateTimeRemaining(targetDate: string): TimeRemaining {
  const target = new Date(targetDate).getTime()
  const now = Date.now()
  const diff = target - now

  // Race finished (24 hours after start)
  const raceEndTime = target + (24 * 60 * 60 * 1000)
  if (now > raceEndTime) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isStarted: false,
      isFinished: true
    }
  }

  // Race in progress
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isStarted: true,
      isFinished: false
    }
  }

  // Race not started yet
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return {
    days,
    hours,
    minutes,
    seconds,
    isStarted: false,
    isFinished: false
  }
}
```

#### 3.3 Styling Considerations

**Design options:**
1. **Gradient background** - Eye-catching, modern
2. **Card format** - Clean, contained
3. **Flip animation** - Numbers flip when changing (advanced)
4. **Pulse effect** - Subtle animation on seconds

**Responsive behavior:**
- Large on desktop (hero section)
- Medium on tablet
- Small on mobile (but still prominent)

---

## Phase 2: Live Forum Implementation (Future)

### 4.1 Requirements Analysis

**Core features:**
1. **User registration/authentication**
   - Email/password or social login
   - User profiles
   - Moderation roles (admin, moderator, user)

2. **Live thread**
   - Real-time message updates
   - WebSocket connection
   - Message history
   - User presence indicators (who's online)

3. **Standard forum threads**
   - Category system
   - Create/reply to threads
   - Pagination
   - Search functionality

4. **Modern UX**
   - Real-time updates
   - Inline editing
   - Reactions/likes
   - @ mentions
   - Rich text editor (markdown or WYSIWYG)

### 4.2 Technology Stack Options

#### Option A: Supabase Realtime (Recommended)
**Pros:**
- Already using Supabase
- Built-in authentication
- Real-time subscriptions via PostgreSQL
- Row-level security
- No additional infrastructure

**Cons:**
- Realtime performance at scale
- Rate limits on free tier

**Implementation:**
```typescript
// Subscribe to new messages
const channel = supabase
  .channel('forum-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'forum_messages'
  }, (payload) => {
    // Handle new message
  })
  .subscribe()
```

#### Option B: Pusher / Ably
**Pros:**
- Purpose-built for real-time
- Excellent scaling
- Built-in presence channels
- Better WebSocket management

**Cons:**
- Additional service/cost
- Extra dependency
- Need to sync with database

#### Option C: Socket.io + Custom Backend
**Pros:**
- Full control
- Most flexible
- Self-hosted option

**Cons:**
- Infrastructure complexity
- Need separate server (not Vercel Edge)
- More maintenance

**Recommendation: Option A (Supabase Realtime)** - Best integration, lowest complexity

### 4.3 Database Schema

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) DEFAULT 'user', -- 'user', 'moderator', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forum categories
CREATE TABLE IF NOT EXISTS forum_categories (
  id SERIAL PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL,
  name_sv VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_sv TEXT,
  slug VARCHAR(100) UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forum threads
CREATE TABLE IF NOT EXISTS forum_threads (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES forum_categories(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,

  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_live BOOLEAN DEFAULT false, -- Special flag for live thread

  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forum messages
CREATE TABLE IF NOT EXISTS forum_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,

  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  content TEXT NOT NULL,
  content_html TEXT, -- Rendered HTML from markdown

  parent_message_id INTEGER REFERENCES forum_messages(id) ON DELETE CASCADE, -- For replies

  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,

  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  reaction_counts JSONB DEFAULT '{}', -- { "👍": 5, "❤️": 3 }

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_messages_thread ON forum_messages(thread_id, created_at DESC);
CREATE INDEX idx_forum_messages_author ON forum_messages(author_id);
CREATE INDEX idx_forum_threads_category ON forum_threads(category_id, last_activity_at DESC);

-- Message reactions
CREATE TABLE IF NOT EXISTS forum_message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES forum_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  reaction VARCHAR(10) NOT NULL, -- Emoji
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(message_id, user_id, reaction)
);

-- User online presence
CREATE TABLE IF NOT EXISTS forum_presence (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT true
);

-- Moderation log
CREATE TABLE IF NOT EXISTS forum_moderation_log (
  id SERIAL PRIMARY KEY,
  moderator_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'delete', 'lock', 'pin', 'ban'
  target_type VARCHAR(50) NOT NULL, -- 'message', 'thread', 'user'
  target_id INTEGER,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.4 Page Structure

```
/forum
  ├─ /forum (main forum overview)
  │   - List of categories
  │   - Live thread (always at top)
  │   - Recent activity
  │
  ├─ /forum/live (dedicated live thread page)
  │   - Real-time chat interface
  │   - Auto-scroll to new messages
  │   - User presence list
  │   - Message input at bottom
  │
  ├─ /forum/[category] (category view)
  │   - List of threads in category
  │   - Pagination
  │   - Create new thread button
  │
  ├─ /forum/[category]/[thread] (thread view)
  │   - Thread title and messages
  │   - Reply interface
  │   - Pagination
  │   - Real-time updates
  │
  └─ /forum/profile/[username] (user profile)
      - User info
      - Recent messages
      - Statistics
```

### 4.5 Component Architecture

```
components/forum/
  ├─ ForumLayout.tsx          - Layout wrapper
  ├─ CategoryList.tsx         - List of categories
  ├─ ThreadList.tsx           - List of threads
  ├─ ThreadView.tsx           - Single thread with messages
  ├─ LiveThread.tsx           - Special live thread component
  ├─ MessageItem.tsx          - Single message display
  ├─ MessageComposer.tsx      - Rich text editor for new messages
  ├─ MessageReactions.tsx     - Reaction picker and display
  ├─ UserPresence.tsx         - Online users indicator
  ├─ MentionPicker.tsx        - @mention autocomplete
  └─ ForumSearch.tsx          - Search interface
```

### 4.6 Authentication Flow

**Using Supabase Auth:**

1. **Sign up:**
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: email,
     password: password,
   })

   // Create user profile
   await supabase.from('user_profiles').insert({
     id: data.user.id,
     username: username,
     display_name: displayName
   })
   ```

2. **Sign in:**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: email,
     password: password,
   })
   ```

3. **Row-Level Security:**
   ```sql
   -- Users can only edit their own messages
   CREATE POLICY "Users can edit own messages"
     ON forum_messages FOR UPDATE
     USING (auth.uid() = author_id);

   -- Moderators can delete any message
   CREATE POLICY "Moderators can delete messages"
     ON forum_messages FOR DELETE
     USING (
       EXISTS (
         SELECT 1 FROM user_profiles
         WHERE id = auth.uid()
         AND role IN ('moderator', 'admin')
       )
     );
   ```

### 4.7 Real-time Implementation

**Live Thread Component:**
```typescript
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function LiveThread({ threadId }: { threadId: number }) {
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load initial messages
    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'forum_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        scrollToBottom()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageComposer threadId={threadId} />
    </div>
  )
}
```

### 4.8 Rich Text Editor Options

**Option A: TipTap (Recommended)**
- Modern, extensible
- Markdown support
- Mention plugin available
- Good TypeScript support

**Option B: Quill**
- Mature, stable
- WYSIWYG
- Good browser support

**Option C: Simple Markdown**
- Textarea + markdown parsing
- Lightweight
- No toolbar complexity

**Recommendation: TipTap** - Best balance of features and UX

### 4.9 Moderation Tools

**Admin interface needed:**
1. Delete/edit messages
2. Lock/unlock threads
3. Ban users
4. View moderation log
5. Pin important threads
6. Move threads between categories

**Create: `/app/admin/forum/page.tsx`**
- Moderation queue
- Reported messages
- User management
- Statistics

### 4.10 Performance Considerations

**Optimization strategies:**
1. **Pagination** - Don't load all messages at once
2. **Virtual scrolling** - For long threads (react-window)
3. **Message caching** - Cache recent messages in localStorage
4. **Debounced search** - Don't search on every keystroke
5. **Rate limiting** - Prevent spam (Supabase functions)
6. **Image optimization** - Compress uploaded images
7. **Lazy load avatars** - Only load visible avatars

### 4.11 Security Considerations

**Important safeguards:**
1. **XSS prevention** - Sanitize HTML content (DOMPurify)
2. **Rate limiting** - Prevent message spam
3. **Content moderation** - Profanity filter (optional)
4. **CAPTCHA** - On registration (hCaptcha/reCAPTCHA)
5. **Email verification** - Verify email before posting
6. **IP logging** - Track abuse
7. **Report system** - User reporting of inappropriate content

---

## Implementation Timeline

### Week 1: Loppet Page
- [ ] Create database schema and migrations
- [ ] Build API endpoints
- [ ] Create page layout and components
- [ ] Admin interface for race management
- [ ] Test and deploy

### Week 2: Navigation Restructure
- [ ] Create new `/deltagare` page
- [ ] Extract and refactor existing components
- [ ] Implement tabbed navigation
- [ ] Set up redirects
- [ ] Update navigation menu
- [ ] Test all deep links
- [ ] Deploy

### Week 3: Dashboard Countdown
- [ ] Build RaceCountdown component
- [ ] Integrate into dashboard
- [ ] Style and responsive design
- [ ] Test across browsers
- [ ] Deploy

### Week 4+: Forum (Future)
- [ ] Database schema
- [ ] Authentication setup
- [ ] Basic forum pages
- [ ] Real-time functionality
- [ ] Rich text editor integration
- [ ] Moderation tools
- [ ] Testing and refinement

---

## Technical Debt and Considerations

### Database Migrations
- Need to run migrations in order
- Consider data seeding for race_info table
- Backup database before major schema changes

### SEO
- Add meta tags for new Loppet page
- Update sitemap.xml
- Add structured data (JSON-LD) for race event
- Consider Open Graph tags for social sharing

### Analytics
- Track page views for new pages
- Monitor tab switching behavior on /deltagare
- Track countdown engagement
- (Future) Forum activity metrics

### Accessibility
- Countdown should have aria-live region
- Tabs must be keyboard navigable
- Forum rich text editor must be accessible
- Color contrast for all new components

### Mobile Optimization
- Countdown must be readable on small screens
- Tabs must work well on mobile
- Forum interface must be touch-friendly

---

## Questions and Decisions Needed

1. **Race information:** Do we have all the race details ready?
   - Exact course map image
   - Live results URL
   - Official descriptions (EN/SV)

2. **Teams gender split:** Should teams page also have gender tabs?
   - Current teams page doesn't separate by gender
   - May need clarification on team structure

3. **Forum moderation:** Who will be moderators?
   - Need to assign initial admin/moderator roles
   - Moderation policy/guidelines needed

4. **User authentication:** Should we allow social login?
   - Google, Facebook, GitHub?
   - Or email/password only?

5. **Forum categories:** What categories do we want?
   - General discussion
   - Training tips
   - Race day logistics
   - Results discussion
   - Other?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Gather race information** for Loppet page
3. **Start with Phase 1, Task 1** (Loppet page)
4. **Iterate and deploy** incrementally
5. **Gather feedback** before starting forum

---

## References and Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TipTap Editor](https://tiptap.dev/)
- [shadcn/ui Tabs Component](https://ui.shadcn.com/docs/components/tabs)
- [React Window (Virtual Scrolling)](https://github.com/bvaughn/react-window)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Author:** Claude Code
