# News Image Upload - FIXED ✅

## Issues Fixed

### 1. ✅ Width Selection Now Works

The WYSIWYG editor now properly respects the width you select:

- **Full bredd (100%)** - Full width
- **Stor (75%)** - 75% width
- **Medium (50%)** - 50% width
- **Liten (33%)** - 33% width

**What was fixed:**

- Extended TipTap's Image extension to allow `style` and `width` attributes
- Images now render with the correct width in both editor and published view

### 2. ✅ Optional Rectangular Crop

Added an **optional** rectangular crop feature (disabled by default).

To enable cropping, edit `components/rich-text-editor.tsx` line 209:

```tsx
// Without crop (current, simpler):
<NewsImageUpload onUploadComplete={handleImageUpload} />

// With optional crop:
<NewsImageUpload onUploadComplete={handleImageUpload} allowCrop={true} />
```

When enabled:

- Upload image → See rectangular crop interface (16:9 aspect ratio)
- Adjust zoom slider to frame the image
- Click "Fortsätt utan beskärning" to skip cropping
- Or click "Avbryt" to cancel and choose a different image

### 3. ✅ No More Circular Crop

Removed the avatar-style circular crop that was inappropriate for news articles.

## How to Use (After Running Migration)

1. **Make sure you've run the SQL migration** (see FIX_NEWS_IMAGE_UPLOAD.md)

2. **Go to Admin > News**

3. **Click the image icon** in the rich text editor toolbar

4. **Upload an image:**

   - Click the upload area
   - Select an image (PNG, JPG, GIF up to 5MB)
   - Image uploads to Supabase

5. **Choose width** (in the preview screen):

   - Select from dropdown: 100%, 75%, 50%, or 33%
   - Preview shows how it will look

6. **Click "Infoga bild"** to insert into article

7. **Image appears in editor** with the selected width

## Testing the Fix

### Test Width Selection:

1. Upload an image
2. Select "Medium (50%)"
3. Insert the image
4. **Result:** Image should be 50% width in editor, not full width

### Verify in HTML:

Inserted images will have a `style` attribute like:

```html
<img src="https://..." style="width: 50%; max-width: 100%; height: auto;" />
```

### Test Published View:

1. Create a news article with different width images
2. Publish it
3. View on `/news/[id]` page
4. Images should render at their specified widths

## Current Configuration

**Crop:** Disabled (simpler workflow)  
**Width options:** 100%, 75%, 50%, 33%  
**Max file size:** 5MB  
**Supported formats:** JPG, PNG, GIF

## Enable Cropping (Optional)

If you want to enable rectangular cropping:

Edit `iau24hwc-app/components/rich-text-editor.tsx` around line 209:

```tsx
<NewsImageUpload
  onUploadComplete={handleImageUpload}
  allowCrop={true} // Add this line
/>
```

Save and restart dev server. Now when you upload, you'll see a crop interface first.

## Technical Details

### Image Extension Configuration

The TipTap Image extension was extended to support:

- `style` attribute for inline width styling
- `width` attribute for semantic HTML
- Both parseHTML and renderHTML handlers
- Height auto-calculated to maintain aspect ratio

### CSS Classes

Images in editor have classes:

- `h-auto` - Height adjusts automatically
- `rounded-lg` - Rounded corners
- `my-4` - Vertical spacing
- `max-w-full` - Never exceed container
- Custom width via `style` attribute

## Files Modified

- ✅ `components/news/NewsImageUpload.tsx` - New uploader with optional crop
- ✅ `components/rich-text-editor.tsx` - Extended Image extension for width support
- ✅ `migrations/021_create_news_images_bucket.sql` - Fixed SQL syntax

## Next Steps

1. ✅ Run migration if you haven't yet
2. ✅ Test uploading images with different widths
3. ✅ Verify in editor that widths are correct
4. ✅ Check published articles display correctly
5. (Optional) Enable cropping if desired
