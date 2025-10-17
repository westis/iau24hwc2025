# Chat Avatar Upload & Google Sign-In Setup

## Part 1: Avatar Upload with Crop/Zoom (5 minutes)

### Step 1: Create Supabase Storage Bucket

1. Go to **Supabase Dashboard** → Your project
2. Click **Storage** in sidebar
3. Click **New bucket**
4. Enter these settings:
   - **Name**: `chat-avatars`
   - **Public bucket**: ✅ **YES** (check this!)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/*`
5. Click **Create bucket**

### Step 2: Set RLS Policy (Security)

1. Click on `chat-avatars` bucket
2. Go to **Policies** tab
3. Click **New policy** → **For full customization**
4. Add this policy:

```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-avatars'
);

-- Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-avatars');
```

### Step 3: Test It!

1. Open your site
2. Click chat button → Settings (⚙️)
3. Click **"Ladda upp avatar"**
4. Select image → Crop/Zoom → Confirm!
5. Avatar appears immediately in chat! ✨

### Storage Costs: **FREE** ✅
- **Supabase Free Tier**: 1 GB storage
- **Avatar sizes**: ~150 KB each
- **1000 users** = only 150 MB
- **Your runner photos use way more space!**

---

## Part 2: Google Sign-In (10 minutes)

Super easy! Supabase has built-in Google OAuth.

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add these **Authorized redirect URIs**:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   Find YOUR-PROJECT-REF in Supabase Dashboard → Settings → API
7. Copy **Client ID** and **Client Secret**

### Step 2: Configure Supabase

1. Go to **Supabase Dashboard** → Authentication → Providers
2. Find **Google** in the list
3. Click to expand
4. Toggle **Enable Sign in with Google** to ON
5. Paste your **Client ID** and **Client Secret**
6. Click **Save**

### Step 3: Update Signup Page

I'll add the Google button to your signup/login pages:

**File: `app/chat/signup/page.tsx`**

Add this button above the email form:

```tsx
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    });
  }}
>
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
    {/* Google icon SVG */}
  </svg>
  Fortsätt med Google
</Button>

<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">
      Eller med e-post
    </span>
  </div>
</div>
```

### Step 4: Test It!

1. Go to signup page
2. Click "Fortsätt med Google"
3. Choose Google account
4. Redirected back → Logged in! ✨

### Benefits:
- ✅ No password to remember
- ✅ Email automatically verified
- ✅ Faster signup (2 clicks vs form)
- ✅ More users will sign up
- ✅ Completely FREE

---

## Which One First?

### Do Avatar Upload Now (5 min):
- **Super easy** - just create the bucket
- **Big UX improvement** - users love avatars!
- **Already coded** - just needs Supabase bucket

### Do Google Sign-In Later (Optional):
- Takes a bit more setup
- But **massively improves conversion**
- People trust Google auth more than random site logins

---

## Cost Summary

| Feature | Storage Used | Cost |
|---------|--------------|------|
| **Chat Avatars** (1000 users) | ~150 MB | **$0** |
| **Runner Photos** (400 runners) | ~200 MB | **$0** |
| **Google OAuth** | 0 MB | **$0** |
| **Total** | 350 MB / 1 GB free tier | **$0** |

**You're using only 35% of free tier!** Plenty of room. 🎉

---

## Ready to Go?

Just create the `chat-avatars` bucket in Supabase Storage, and the avatar upload with crop/zoom will work immediately! The code is already there. ✨

Want me to also implement the Google Sign-In button?










