# Race Photos Bucket Migration

## ⚠️ Action Required: Run This Migration in Supabase

The image upload for race info (course maps and hero images) requires a Supabase Storage bucket that needs to be created manually.

### 🚀 How to Run the Migration

1. **Go to Supabase Dashboard**
   - Open your Supabase project
   - Navigate to **SQL Editor** in the left sidebar

2. **Copy the SQL**
   - Open `migrations/023_create_race_photos_bucket.sql`
   - Copy the entire SQL content

3. **Run the SQL**
   - Paste it into a new query in the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

4. **Verify the Bucket**
   - Go to **Storage** in the left sidebar
   - You should see a `race-photos` bucket
   - It should be marked as **Public**

### ✅ What This Creates

This migration creates:
- ✅ `race-photos` storage bucket (public read access)
- ✅ RLS policies allowing authenticated users to:
  - Upload race photos
  - Update race photos
  - Delete race photos

### 🎯 What This Fixes

After running this migration:
- ✅ Admins can upload course map images in Race Info
- ✅ Admins can upload hero images in Race Info
- ✅ No more "Failed to upload image" errors
- ✅ Images are properly stored in Supabase Storage

### 📝 Related Files

- **Bucket migration**: `migrations/023_create_race_photos_bucket.sql`
- **Race admin page**: `app/admin/race/page.tsx`
- **Upload API**: `app/api/upload/image/route.ts`

---

## 🔍 Troubleshooting

**Still getting upload errors?**

1. Check the bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'race-photos';
   ```

2. Check the policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%race photos%';
   ```

3. Make sure you're logged in when uploading

**Bucket already exists error?**
- That's fine! The `ON CONFLICT DO NOTHING` clause handles this
- The migration is safe to run multiple times


