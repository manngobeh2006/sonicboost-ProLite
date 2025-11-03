# Enable Leaked Password Protection

## 🔐 Security Enhancement: HaveIBeenPwned Integration

This setting prevents users from using passwords that have been compromised in data breaches.

---

## 📋 How to Enable (2 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your SonicBoost project

### Step 2: Navigate to Auth Settings
1. Click **Authentication** in the left sidebar
2. Click **Policies** tab (or **Settings** → **Auth**)

### Step 3: Enable Leaked Password Protection
1. Look for **"Password Protection"** or **"Leaked Password Protection"**
2. Toggle it **ON**
3. Click **Save**

---

## 🎯 What This Does

When enabled, Supabase will:
- ✅ Check new passwords against HaveIBeenPwned.org database
- ✅ Block users from using compromised passwords
- ✅ Protect your users from credential stuffing attacks
- ✅ Improve overall account security

**Example**:
```
User tries to set password: "password123"
→ Blocked! This password appears in 24,000+ data breaches
→ User must choose a different password
```

---

## ⚙️ Alternative: Enable via SQL (If UI Option Not Available)

If the UI toggle isn't visible, you can enable it via the Supabase config:

```sql
-- This may require admin access
-- Check your Supabase project settings or contact Supabase support
```

**Note**: This setting is usually in the Authentication → Policies section of the dashboard.

---

## ✅ Verification

After enabling:
1. Try to create a test user with password "password123"
2. You should get an error: "Password has been found in a data breach"
3. This means it's working! ✅

---

## 📊 Impact

**User Experience**:
- Minimal - users just need to pick stronger passwords
- Better security for their accounts

**Performance**:
- None - check happens during signup/password reset only
- Uses Supabase's cached breach database

**Security Benefit**:
- Prevents 80%+ of common password attacks
- Protects users who reuse passwords across sites

---

## 🎓 Best Practice

**Always enable this in production!**

Users often reuse passwords. If their password was leaked elsewhere, attackers can:
1. Find their email in breach databases
2. Try the leaked password on your app
3. Access their account (credential stuffing)

This feature blocks that attack vector.

---

**Status**: ⚠️ Currently Disabled  
**Action Required**: Enable in Supabase Dashboard → Authentication → Policies  
**Priority**: Medium (should enable before production launch)
