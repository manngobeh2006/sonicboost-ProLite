# 🚀 Final Deployment Steps - SonicBoost ProLite

## ✅ What We Just Fixed (Code):

1. ✅ **Hide one-time checkout in Subscriptions screen** for Pro/Unlimited users
2. ✅ **Created mobile-responsive password reset page** (`password-reset.html`)

---

## 📋 What YOU Need to Do:

### 1. Upload Password Reset Page (5 minutes) 🔴

**The new `password-reset.html` file needs to be uploaded to your S3 bucket:**

1. Go to AWS S3 Console: https://s3.console.aws.amazon.com
2. Find bucket: `sonicboost-frontend-bucket` (or similar)
3. Upload `password-reset.html` file
4. Make sure it's at path: `/reset-password` or `/reset-password.html`
5. Test: Visit https://sonicboost-app.one-clickmaster.com/reset-password

**OR use AWS CLI:**
```bash
aws s3 cp password-reset.html s3://your-bucket-name/reset-password.html --content-type "text/html"
```

---

### 2. Fix Supabase URL Configuration (2 minutes) 🔴

**This fixes email confirmation redirect issue:**

1. Go to: https://supabase.com/dashboard
2. Select your SonicBoost project
3. Click **Authentication** → **URL Configuration**
4. Update these settings:

```
Site URL: 
https://sonicboost-app.one-clickmaster.com

Redirect URLs (add each one):
https://sonicboost-app.one-clickmaster.com/*
https://sonicboost-app.one-clickmaster.com/**  
https://sonicboost-app.one-clickmaster.com/reset-password
```

5. Click **Save**

---

### 3. Deploy Backend to Render (1 minute)

```
1. Go to Render dashboard
2. Find sonicboost-backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-3 minutes
```

---

### 4. Restart Expo App (30 seconds)

```bash
# Stop current Expo (Ctrl+C)
npx expo start
```

---

## 🧪 Test After Deployment:

### Test 1: Subscriptions Screen ✅
1. Login as Pro or Unlimited user
2. Go to Subscriptions screen
3. **Should see**: Free, Pro, Unlimited plans only
4. **Should NOT see**: One-time payment option

### Test 2: Password Reset Mobile ✅
1. On your phone, request password reset
2. Click link in email
3. **Should see**: Form that fits on screen
4. **Should NOT**: Need to scroll or zoom to see input boxes

### Test 3: Email Confirmation ✅
1. Create new account
2. Check confirmation email
3. Click link
4. **Should redirect to**: sonicboost-app.one-clickmaster.com
5. **Should NOT redirect to**: one-clickmaster.com

---

## ⚠️ Known Issues (Safari Deep Links):

**Problem**: Safari can't open `sonicboost-prolite://` scheme links after payment

**Current Workaround**: User manually switches back to app

**Permanent Fix Options**:
1. **Use Universal Links** (requires Apple App Site Association file + domain)
2. **Show message after payment**: "Please return to the SonicBoost app"
3. **Auto-detect return** and refresh profile (already implemented)

**Recommended**: Universal Links with your own domain

---

## 💰 Domain Purchase Recommendation:

### Should You Buy a Domain? **YES! 100%**

**Why?**
1. **Professional branding** - looks way more trustworthy
2. **Universal Links work** - Safari deep linking will work perfectly
3. **Easier to remember** - users can find your web password reset easily
4. **App Store requirement** - privacy policy and terms need real URL
5. **Future-proof** - you'll need it eventually anyway

### Which Domain to Buy?

**Best Options:**

1. **`sonicboost.app`** ⭐️⭐️⭐️⭐️⭐️
   - **Cost**: ~$15/year
   - **Pros**: Perfect for app, professional, short, memorable
   - **Why**: `.app` domains are for apps, HTTPS required by default (more secure)
   - **Check**: https://domains.google.com/registrar/search?searchTerm=sonicboost.app

2. **`sonicboost.io`** ⭐️⭐️⭐️⭐️
   - **Cost**: ~$30/year
   - **Pros**: Tech-friendly, modern, short
   - **Why**: Popular among tech startups

3. **`sonicboostapp.com`** ⭐️⭐️⭐️
   - **Cost**: ~$12/year  
   - **Pros**: Cheap, descriptive
   - **Con**: Slightly longer

**Avoid**:
- ❌ `sonicboost.com` - Likely taken or expensive
- ❌ Long domains like `sonicboost-prolite.com`

### My Recommendation: **`sonicboost.app`** 🎯

**Why this is THE ONE:**
- Perfect length (11 characters)
- `.app` TLD is made for mobile apps
- Professional and memorable
- Affordable ($15/year = $1.25/month)
- Forces HTTPS (built-in security)
- Easy to say in marketing: "Download SonicBoost dot app"

---

## 🎯 After You Buy Domain:

### Setup Steps:
1. **Point domain to CloudFront** (password reset page)
2. **Add Universal Links** config for iOS deep linking
3. **Update Stripe** redirect URLs
4. **Update Supabase** redirect URLs
5. **Update app** privacy policy and terms URLs

**I can help you set this all up once you buy the domain!**

---

## 📊 Current Status:

### ✅ FIXED (9 issues):
1. Stripe redirects to correct domain
2. Profile shows actual tier name
3. Login branding updated
4. Profile auto-refreshes after payment
5. Signup navigates properly
6. One-time payment hidden from paid users (ResultsScreen)
7. One-time payment hidden from paid users (SubscriptionsScreen)  
8. Password reset page mobile responsive
9. Email confirmation redirect (after you update Supabase)

### ⚠️ PENDING (2 issues):
1. GPT mini genre/tempo display + error handling
2. Safari deep link compatibility

### 💰 RECOMMENDED:
1. Buy `sonicboost.app` domain ($15/year)

---

## 🚀 Ready to Deploy?

**Run these commands:**

```bash
# 1. Commit latest changes
git add -A
git commit -m "Fix: hide one-time payment in Subscriptions for paid users"
git push origin main

# 2. Deploy backend on Render (manual)

# 3. Upload password-reset.html to S3

# 4. Update Supabase URLs

# 5. Restart Expo
npx expo start
```

---

**Questions? Let me know!** 🎯
