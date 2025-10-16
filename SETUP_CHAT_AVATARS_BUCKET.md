# Create Chat Avatars Storage Bucket

## The Error

`Failed to upload image` means the `chat-avatars` bucket doesn't exist in Supabase Storage yet.

## Fix (5 minutes):

### Step 1: Go to Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **iau24hwc2025** (or whatever your project is named)
3. Click **Storage** in the left sidebar

### Step 2: Create the Bucket

1. Click the **New bucket** button (top right)
2. Fill in these settings:
   - **Name**: `chat-avatars`
   - **Public bucket**: ✅ **CHECK THIS BOX** (very important!)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/*`
3. Click **Create bucket**

### Step 3: Set RLS Policies

After creating the bucket, you need to allow uploads:

1. Click on the `chat-avatars` bucket you just created
2. Click the **Policies** tab
3. Click **New policy**
4. Click **For full customization**
5. Paste this SQL and click **Review**:

```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-avatars');

-- Allow public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-avatars');
```

6. Click **Save policy**

### Step 4: Test It!

1. Go back to your site
2. Click chat → Settings (⚙️)
3. Click **"Ladda upp avatar"**
4. Select an image
5. ✅ It should work now!

---

## Alternative: SQL Script (Faster)

If you prefer to do it all via SQL, run this in Supabase SQL Editor:

```sql
-- Create the bucket (if you haven't via UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-avatars', 'chat-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set the policies
CREATE POLICY "Users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-avatars');

CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-avatars');

CREATE POLICY "Users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-avatars');

CREATE POLICY "Users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-avatars');
```

---

## Verify It Worked

After creating the bucket, you should see:

1. **Storage** → **chat-avatars** bucket listed
2. **Policies** tab shows 4 policies
3. **Public** badge on the bucket

Then try uploading an avatar again! 🎨

---

## Why This Happened

The code was ready, but Supabase Storage needs you to manually create buckets for security reasons. Each bucket needs explicit policies about who can upload/read/delete.

This is the same setup you already have for:

- `runner-photos`
- `team-photos`
- `race-photos`

Now you're adding:

- `chat-avatars` ✨

---

## Still Getting Errors?

If you still get errors after creating the bucket, check:

1. **Is bucket public?** (Should have "Public" badge)
2. **Do policies exist?** (Check Policies tab)
3. **Check browser console** for more specific error

Let me know if you need help! 🚀





