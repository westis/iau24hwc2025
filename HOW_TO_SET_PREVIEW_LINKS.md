# How to Set Preview Article Links

## Quick Guide (2 minutes)

### Step 1: Find Your Article IDs

1. Go to `/admin/news` on your site
2. Look at the news articles list - **the first column shows the ID number**
3. Note which article is your:
   - **Men's preview** (e.g., ID: 5)
   - **Women's preview** (e.g., ID: 8)

### Step 2: Update the Code

1. Open: `iau24hwc-app/app/participants/page.tsx`
2. Find this section (around line 100-104):

```typescript
// Preview article links - configure these to match your news article IDs
const previewLinks = {
  men: "/news/1", // Replace with actual men's preview article ID
  women: "/news/2", // Replace with actual women's preview article ID
};
```

3. **Change the numbers** to match your article IDs:

```typescript
const previewLinks = {
  men: "/news/5", // ← Replace 1 with your men's preview ID
  women: "/news/8", // ← Replace 2 with your women's preview ID
};
```

4. Save the file

### Step 3: Push to GitHub

```bash
git add app/participants/page.tsx
git commit -m "Update preview article links"
git push origin main
```

Vercel will auto-deploy in ~2 minutes! ✅

---

## Example

If your news admin page shows:

| ID    | Title                    | Published |
| ----- | ------------------------ | --------- |
| 3     | Race Schedule            | ✅        |
| **5** | **Men's Race Preview**   | ✅        |
| **8** | **Women's Race Preview** | ✅        |
| 12    | Latest Updates           | ✅        |

Then set:

```typescript
const previewLinks = {
  men: "/news/5",
  women: "/news/8",
};
```

---

## Alternative: Check URL When Viewing Article

1. Go to your public site
2. Click on the preview article in the news feed
3. Look at the URL: `https://yoursite.com/news/5`
4. The number at the end is the ID!

---

## Need to Create the Preview Articles?

1. Go to `/admin/news`
2. Click **"Create News"**
3. Write your preview article
4. Click **"Publish"**
5. Note the ID from the news list
6. Repeat for the other gender's preview
7. Update the config as described above

---

That's it! The banner will automatically show the correct preview based on which gender tab is selected. 🎯
