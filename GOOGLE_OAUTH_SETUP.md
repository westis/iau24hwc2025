# Google Sign-In Setup Guide

## Complete Step-by-Step Instructions

### Part 1: Get Client ID & Client Secret from Google (10 min)

#### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

#### Step 2: Create a New Project (or use existing)

1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Click **"New Project"**
3. Enter project name: `IAU 24h WC Chat` (or any name you like)
4. Click **"Create"**
5. Wait a few seconds for it to be created
6. Make sure the new project is selected (check the project dropdown)

#### Step 3: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**

2. **If you see "User Type" options**:

   - Choose **External** (allows anyone with a Google account)
   - Click **"Create"**

3. **If you see a menu like this** (Overview, Branding, Audience, etc.):

   - You're already in the consent screen configuration! Continue below.

4. Fill in the **required fields** (might be under "Branding" or similar):
   - **App name**: `IAU 24h World Championship Chat`
   - **User support email**: Your email
   - **Developer contact email**: Your email
   - **App logo**: Optional (skip for now)
5. **Save** the configuration

6. If asked about **Scopes**: Click "Save and Continue" (don't need to add any)

7. If asked about **Test users**: Click "Save and Continue" (don't need to add any)

#### Step 4: Create OAuth Client ID

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Choose **"OAuth client ID"**
4. Select **Application type**: `Web application`
5. Enter **Name**: `IAU 24h WC Web Client`
6. Under **Authorized JavaScript origins**, click **"+ ADD URI"**:

   ```
   http://localhost:3000
   https://iau24hwc2025.ultramarathon.se
   ```

   (Add both - one for local dev, one for production)

7. Under **Authorized redirect URIs**, click **"+ ADD URI"** and add:

   **For localhost:**

   ```
   http://localhost:3000/auth/callback
   ```

   **For production (you need your Supabase project URL):**

   - Go to your Supabase Dashboard
   - Click **Settings** (gear icon in sidebar)
   - Click **API** in the settings menu
   - Copy your **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - Add this redirect URI:

   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```

   **Example:**
   If your Supabase URL is `https://xyzabc123.supabase.co`, then add:

   ```
   https://xyzabc123.supabase.co/auth/v1/callback
   ```

8. Click **"CREATE"**

#### Step 5: Copy Your Credentials

A popup will appear with your credentials:

1. **Copy the Client ID** - looks like:
   ```
   123456789-abc123def456.apps.googleusercontent.com
   ```
2. **Copy the Client Secret** - looks like:
   ```
   GOCSPX-abc123def456ghi789
   ```

⚠️ **SAVE THESE SOMEWHERE!** You'll need them in the next step.

If you close the popup, you can always view them again:

- Go to **Credentials**
- Click on your OAuth client name
- Your Client ID and Secret are shown there

---

### Part 2: Configure Supabase (3 min)

#### Step 1: Open Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Authentication** in the sidebar
4. Click **Providers** tab

#### Step 2: Enable Google Provider

1. Find **Google** in the list of providers
2. Toggle it **ON** (the switch should turn green)
3. Paste your **Client ID** from Google
4. Paste your **Client Secret** from Google
5. Click **"Save"**

✅ **Done!** Google Sign-In is now enabled!

---

### Part 3: Test It! (2 min)

#### Local Testing:

1. Start your dev server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`
3. Click the chat button
4. Click **"Create account"** or **"Sign in"**
5. Click **"Fortsätt med Google"**
6. Choose your Google account
7. ✅ You should be logged in!

#### Production Testing:

1. Deploy your site to Vercel (if not already)
2. Go to your live site
3. Try the same flow
4. ✅ Should work!

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem**: The redirect URI you're using doesn't match what's in Google Cloud Console.

**Fix**:

1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client
3. Make sure you have BOTH:
   - `http://localhost:3000/auth/callback` (for dev)
   - `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (for production)

### Error: "access_denied"

**Problem**: OAuth consent screen not configured.

**Fix**:

1. Go to Google Cloud Console → OAuth consent screen
2. Complete all required fields
3. Save

### Error: "invalid_client"

**Problem**: Client ID or Secret is wrong.

**Fix**:

1. Go back to Google Cloud Console → Credentials
2. Copy the Client ID and Secret again
3. Paste them into Supabase (make sure no extra spaces!)

### Users see "This app isn't verified"

**Problem**: Google shows a warning for unverified apps.

**Fix** (Optional - only needed for public apps):

1. Click **"Advanced"** on the warning screen
2. Click **"Go to [your app] (unsafe)"**
3. For a proper fix, you'd need to verify your app with Google (takes weeks)

For a race chat, this is fine! Your users just click "Advanced" → Continue.

---

## Quick Reference

### What You Need:

**From Google Cloud Console:**

- ✅ Client ID (looks like: `123456-abc.apps.googleusercontent.com`)
- ✅ Client Secret (looks like: `GOCSPX-abc123`)

**From Supabase Dashboard:**

- ✅ Project URL (looks like: `https://abc123.supabase.co`)

**Authorized Redirect URIs to add in Google:**

- ✅ `http://localhost:3000/auth/callback` (dev)
- ✅ `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (prod)

---

## Benefits of Google Sign-In

Once set up, users can:

- ✅ Sign up in **2 clicks** (vs filling a form)
- ✅ No password to remember
- ✅ Email automatically verified
- ✅ More trust (people trust Google auth)
- ✅ Faster conversion (more users will sign up!)

---

## Cost

**Google OAuth is 100% FREE!** ✅

- No API costs
- No usage limits
- No quota restrictions for auth

---

Need help? Let me know which step you're stuck on! 🚀
