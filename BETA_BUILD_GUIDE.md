# 📱 Beta Build Guide - SonicBoost ProLite

Complete guide for creating Android builds for beta testing.

---

## Prerequisites ✅

- ✅ EAS CLI installed globally
- ✅ Expo account (create at expo.dev if you don't have one)
- ✅ Google Play Console account (for Play Store internal testing)

---

## Step 1: Login to Expo

```bash
eas login
```

Enter your Expo account credentials. If you don't have an account:
1. Go to https://expo.dev
2. Sign up for free
3. Then run `eas login`

---

## Step 2: Configure Your Project

```bash
# Link project to your Expo account
eas build:configure
```

This will:
- Create a project on Expo servers
- Link your local project to it
- Set up necessary configuration

---

## Step 3: Build APK (Direct Installation)

**For direct testing without Play Store:**

```bash
eas build --platform android --profile preview
```

**What this does:**
- ✅ Builds an APK file (installable on any Android device)
- ✅ Takes ~10-15 minutes
- ✅ Downloads to your computer or provides download link
- ✅ Can share APK file directly with testers

**After build completes:**
1. Download the APK from the link provided
2. Share APK file via email, Google Drive, Dropbox, etc.
3. Testers install by enabling "Install from Unknown Sources" on their device

---

## Step 4: Build AAB (Google Play Store)

**For Google Play Store internal testing:**

```bash
eas build --platform android --profile production
```

**What this does:**
- ✅ Builds Android App Bundle (AAB) - required for Play Store
- ✅ Optimized and smaller than APK
- ✅ Takes ~10-15 minutes
- ✅ Ready to upload to Play Store Console

---

## Step 5: Upload to Google Play Console

### A. First Time Setup (One-time)

1. **Create App in Play Console:**
   - Go to https://play.google.com/console
   - Click "Create app"
   - Fill in app details:
     - App name: SonicBoost ProLite
     - Default language: English
     - App/Game: App
     - Free/Paid: Free

2. **Set up Internal Testing:**
   - Go to "Testing" → "Internal testing"
   - Click "Create new release"
   - Upload the AAB file from EAS Build

3. **Add Testers:**
   - Create an email list
   - Add tester emails
   - Save and review release

4. **Roll out release:**
   - Click "Start rollout to Internal testing"
   - Share the testing link with your testers

### B. Subsequent Builds

For future builds, just:
```bash
# Build new AAB
eas build --platform android --profile production

# Then upload to Play Console:
# - Go to Internal testing
# - Create new release
# - Upload new AAB
# - Roll out
```

---

## Build Profiles Explained

### `preview` (APK)
```bash
eas build --platform android --profile preview
```
- **Output:** APK file
- **Use:** Direct distribution to testers
- **Pros:** Quick sharing, no Play Store needed
- **Cons:** Manual installation required

### `production` (AAB)
```bash
eas build --platform android --profile production
```
- **Output:** Android App Bundle (AAB)
- **Use:** Google Play Store (internal/beta/production)
- **Pros:** Official distribution, automatic updates
- **Cons:** Requires Play Console setup

---

## Version Management

### Before each new build:

**Update version in app.json:**
```json
{
  "expo": {
    "version": "1.0.1",  // Increment for each release
    "android": {
      "versionCode": 2   // Increment for each build
    }
  }
}
```

**Rules:**
- `version`: User-facing (1.0.0, 1.0.1, 1.1.0, etc.)
- `versionCode`: Monotonically increasing integer (1, 2, 3, 4, etc.)
- **Must increment `versionCode` for each Play Store upload**

---

## Monitoring Builds

### Check build status:
```bash
eas build:list
```

### View specific build:
```bash
eas build:view [build-id]
```

### Cancel a build:
```bash
eas build:cancel [build-id]
```

---

## Testing Checklist

Before distributing to testers:

- [ ] All code committed and pushed to git
- [ ] Version numbers updated in app.json
- [ ] Backend is live and healthy
- [ ] Environment variables configured (EXPO_PUBLIC_*)
- [ ] Tested locally with `expo start`
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Backend tests passing (51/51)

---

## Distribution Methods

### Method 1: Direct APK (Fastest)

**Steps:**
1. Build APK: `eas build -p android --profile preview`
2. Download APK when build completes
3. Share via:
   - Google Drive
   - Dropbox
   - Email attachment
   - Direct link from EAS Build

**Testers need to:**
1. Download APK to Android device
2. Enable "Install from Unknown Sources"
3. Open APK file to install
4. Open app and test

### Method 2: Google Play Internal Testing (Professional)

**Steps:**
1. Build AAB: `eas build -p android --profile production`
2. Upload to Play Console Internal Testing
3. Add tester emails to tester list
4. Share Play Store testing link

**Testers need to:**
1. Click the testing link
2. Opt-in to testing
3. Download from Play Store
4. Automatic updates for future builds

---

## Costs

### EAS Build (Expo)
- **Free Tier:** 30 builds/month (Android + iOS combined)
- **Paid Plans:** $29/month for unlimited builds
- **Recommendation:** Start with free tier for beta

### Google Play Console
- **One-time fee:** $25 (lifetime)
- Required for Play Store distribution

---

## Common Issues & Solutions

### Issue: "No valid credentials"
**Solution:**
```bash
eas login
eas build:configure
```

### Issue: "Build failed"
**Solution:**
1. Check build logs: `eas build:view [build-id]`
2. Common fixes:
   - Update dependencies: `npm install`
   - Clear cache: `npx expo start --clear`
   - Check app.json syntax

### Issue: "APK won't install"
**Solution:**
1. Enable "Install from Unknown Sources" on Android
2. Check Android version (minimum: Android 5.0)
3. Ensure device has enough storage

### Issue: "Can't upload to Play Store"
**Solution:**
1. Ensure versionCode is incremented
2. Build must be AAB (not APK)
3. Use production profile

---

## Quick Reference Commands

```bash
# Login
eas login

# Build APK (direct distribution)
eas build -p android --profile preview

# Build AAB (Play Store)
eas build -p android --profile production

# Check builds
eas build:list

# View build details
eas build:view [build-id]

# Update project
eas update

# Check account
eas whoami
```

---

## Next Steps After Building

1. **Test the build yourself first**
   - Install on your own device
   - Test all critical flows
   - Check for any issues

2. **Send to small group (5-10 people)**
   - Close friends/colleagues first
   - Get initial feedback
   - Fix critical bugs

3. **Expand testing (20-50 people)**
   - Wider beta group
   - Monitor crash reports via Sentry
   - Collect structured feedback

4. **Prepare for launch**
   - Fix all critical bugs
   - Polish UI/UX based on feedback
   - Prepare marketing materials
   - Set up app store listing

---

## Support

**EAS Build Documentation:**
https://docs.expo.dev/build/introduction/

**Google Play Console Help:**
https://support.google.com/googleplay/android-developer

**Issues?**
Check Expo forums or contact support at support@sonicboost.app

---

**Last Updated:** January 8, 2025  
**Status:** Ready for beta testing
