# 🚀 Quick Build Commands

Copy-paste these commands to build your app for beta testing.

---

## First Time Setup (One-time)

```bash
# 1. Login to Expo (use your expo.dev account)
eas login

# 2. Link project to Expo
eas build:configure
```

---

## Build APK (Direct Distribution)

**Use this for quick testing with a small group:**

```bash
eas build --platform android --profile preview
```

⏱️ Takes ~10-15 minutes  
📦 Outputs: APK file  
📤 Share directly with testers

---

## Build AAB (Google Play Store)

**Use this for official Play Store internal testing:**

```bash
eas build --platform android --profile production
```

⏱️ Takes ~10-15 minutes  
📦 Outputs: AAB file  
📤 Upload to Play Console

---

## Monitor Your Builds

```bash
# See all your builds
eas build:list

# Check specific build details
eas build:view [build-id]
```

---

## Before Each Build

**Update version numbers in `app.json`:**

```json
{
  "expo": {
    "version": "1.0.1",    // Increment (user sees this)
    "android": {
      "versionCode": 2     // Increment by 1 each build
    }
  }
}
```

---

## Download Your Build

After build completes:

1. **From Terminal:** Click the link in terminal output
2. **From Dashboard:** Go to https://expo.dev → Your project → Builds
3. **Direct download:** Get shareable link for testers

---

## Distribution Options

### Option 1: Share APK Link (Fastest)
- Build with `preview` profile
- Copy download link from EAS
- Share link with testers
- They download and install

### Option 2: Share APK File
- Build with `preview` profile  
- Download APK to your computer
- Upload to Google Drive/Dropbox
- Share file link with testers

### Option 3: Google Play Internal Testing (Professional)
- Build with `production` profile
- Upload AAB to Play Console
- Add tester emails
- Share Play Store testing link

---

## Troubleshooting

**Build failed?**
```bash
# Check what went wrong
eas build:view [build-id]

# Try again
eas build --platform android --profile preview --clear-cache
```

**Not logged in?**
```bash
eas login
eas whoami
```

---

## Cost Info

- **Expo Free Tier:** 30 builds/month
- **Plenty for beta testing!**
- Upgrade to $29/month only if you need more

---

For detailed guide, see `BETA_BUILD_GUIDE.md`
