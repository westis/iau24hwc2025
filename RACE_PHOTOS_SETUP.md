# Race Photos Setup Guide

This document describes how to set up the `race-photos` bucket in Supabase for storing race images (course maps, hero images, etc.).

## Prerequisites

- Supabase project is already set up
- You have access to the Supabase dashboard

## Steps to Create the Bucket

### 1. Create the Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the sidebar
3. Click **Create a new bucket**
4. Enter the following details:
   - **Name**: `race-photos`
   - **Public bucket**: ✅ Check this box (to allow public read access)
5. Click **Create bucket**

### 2. Set Up Bucket Policies

The bucket needs to be publicly readable but only writable by authenticated admins.

1. In the Storage section, click on the `race-photos` bucket
2. Go to **Policies**
3. Add the following policies:

#### Public Read Policy

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'race-photos' );
```

#### Authenticated Write Policy

```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'race-photos' 
  AND auth.role() = 'authenticated'
);
```

#### Authenticated Delete Policy

```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'race-photos'
  AND auth.role() = 'authenticated'
);
```

## Usage

The race photos bucket is used for:

- **Course Map Images**: Maps showing the race route/course
- **Hero Images**: Featured promotional images for the race

### In the Admin Interface

1. Navigate to `/admin/race`
2. Scroll to the "Links & Media" section
3. Use the **Upload Course Map** button to upload course map images
4. Use the **Upload Hero Image** button to upload hero/featured images
5. Each image can be cropped to 16:9 aspect ratio before saving

### Image Specifications

- **Maximum file size**: 5MB
- **Supported formats**: All image formats (JPEG, PNG, WebP, etc.)
- **Recommended aspect ratio**: 16:9 for both course maps and hero images
- **Recommended dimensions**: At least 1920x1080px for best quality

## Security Notes

- Only authenticated users can upload/delete images
- The upload API validates file types and sizes
- All uploads go through the server-side API with proper validation
- Public read access is enabled so images can be displayed on the public race page

## Troubleshooting

### Upload Fails with "Invalid bucket" Error

- Ensure the `race-photos` bucket exists in Supabase Storage
- Check that the bucket name is exactly `race-photos` (case-sensitive)

### Images Not Displaying

- Verify the bucket is set to **Public**
- Check that the public read policy is in place
- Ensure the image URL is properly saved in the database

### Permission Denied Errors

- Verify you're logged in as an admin user
- Check that the authenticated write policies are properly configured

