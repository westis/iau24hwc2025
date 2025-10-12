# Team & Runner Profiles Setup Guide

This guide will help you set up the team pages and enhanced runner profiles with photos and social links.

## Step 1: Run Database Migrations

You need to run two SQL migration files in your Supabase database.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `cxvlndgqwlpeddupqpuf`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the content from `migrations/005_add_runner_profile_fields.sql`
6. Click **Run** (bottom right)
7. Repeat for `migrations/006_create_teams_table.sql`

### Option B: Using psql Command Line

If you have `psql` installed:

```bash
cd iau24hwc-app

# Run migrations
psql "postgresql://postgres.cxvlndgqwlpeddupqpuf:UVx6xYuB2dl2F09w@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" -f migrations/005_add_runner_profile_fields.sql

psql "postgresql://postgres.cxvlndgqwlpeddupqpuf:UVx6xYuB2dl2F09w@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" -f migrations/006_create_teams_table.sql
```

### Verify Migrations Ran Successfully

In Supabase SQL Editor, run:

```sql
-- Check new columns exist in runners table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'runners'
AND column_name IN ('photo_url', 'bio', 'instagram_url', 'strava_url');

-- Check teams table exists
SELECT * FROM teams LIMIT 1;
```

You should see the 4 new columns in runners and the teams table (even if empty).

## Step 2: Set Up Supabase Storage Buckets

You need to create two storage buckets for images.

### Create Buckets:

1. In Supabase Dashboard, go to **Storage** in left sidebar
2. Click **New Bucket**

**Bucket 1: runner-photos**
- Name: `runner-photos`
- Public bucket: ✅ YES (check this!)
- File size limit: 5 MB (optional)
- Allowed MIME types: `image/*` (optional)
- Click **Create Bucket**

**Bucket 2: team-photos**
- Name: `team-photos`
- Public bucket: ✅ YES (check this!)
- File size limit: 5 MB (optional)
- Allowed MIME types: `image/*` (optional)
- Click **Create Bucket**

### Set Bucket Policies (Make Images Publicly Accessible):

For each bucket, you need to add a policy to allow public read access:

1. Click on the bucket name
2. Click **Policies** tab
3. Click **New Policy**
4. Select **"Allow public read access"** template
5. Or create custom policy with this SQL:

```sql
-- Policy for runner-photos bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'runner-photos' );

-- Policy for team-photos bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'team-photos' );
```

6. Click **Save**

### Verify Storage Setup:

1. Go to Storage → runner-photos
2. Try uploading a test image manually
3. Click on the uploaded image
4. You should see a **Copy URL** button
5. The URL should look like: `https://cxvlndgqwlpeddupqpuf.supabase.co/storage/v1/object/public/runner-photos/test.jpg`

## Step 3: Update Environment Variables (Already Done)

Your `.env.local` already has the Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://cxvlndgqwlpeddupqpuf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

These are needed for the file upload functionality.

## What's Next?

Once you've completed Steps 1 and 2, let me know and I'll continue implementing:

- [ ] API endpoints for uploading images
- [ ] API endpoints for teams CRUD
- [ ] Image upload component
- [ ] Admin forms for editing runner profiles
- [ ] Admin page for managing team content
- [ ] Team detail pages (e.g., /teams/SWE)
- [ ] Enhanced runner profile pages with photos and social links

## Troubleshooting

**"Cannot create bucket"**
- Make sure you're in the correct Supabase project
- Check you have admin permissions

**"Policy error"**
- Supabase free tier allows public buckets
- Make sure bucket is set to "Public" when creating

**"Image uploads don't work"**
- Verify buckets are public
- Check browser console for errors
- Verify NEXT_PUBLIC_SUPABASE_URL is correct

## Questions?

Let me know when you've completed the database migrations and storage setup, and I'll continue with the implementation!
