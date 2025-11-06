# Fix User Registration Issue

## Problem
Users cannot sign up because RLS policy blocks direct INSERTs into the `users` table.

## Solution
Use a database trigger to automatically create user profiles when Supabase Auth creates a new user.

---

## Steps to Fix

### 1. Run SQL in Supabase

1. Go to: https://supabase.com/dashboard
2. Select your SonicBoost project
3. Click **SQL Editor**
4. Paste the entire contents of `database/create_user_trigger.sql`
5. Click **Run**

You should see a success message confirming the trigger was created.

### 2. Reload Your Mobile App

```bash
# In the Expo terminal, press 'r' to reload
```

### 3. Test Signup

Try creating a new account. The trigger will automatically:
- Create the user profile in `public.users`
- Set subscription_tier to 'free'
- Set subscription_status to 'free'
- Initialize enhancements_this_month to 0

---

## How It Works

**Before (❌ Broken):**
```
User signs up → Supabase creates auth.users → App tries to INSERT public.users → RLS blocks → ERROR
```

**After (✅ Fixed):**
```
User signs up → Supabase creates auth.users → Database trigger creates public.users → SUCCESS
```

---

## Verification

After running the SQL, you can verify the trigger exists:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Should return:
```
trigger_name         | event_manipulation | event_object_table
---------------------|-------------------|-------------------
on_auth_user_created | INSERT            | users
```

---

## What Changed in Code

1. **Removed** manual INSERT in `authStore.ts` signup function
2. **Added** user metadata (name) to `signUp()` call
3. **Wait** 1 second for trigger to execute before fetching profile
4. **Gracefully handle** if profile isn't ready yet

---

## If Still Having Issues

1. Check Supabase logs: Database → Logs
2. Verify trigger exists: Run verification SQL above
3. Check RLS policies are correct
4. Ensure grants were applied

---

**Status**: Ready to test! 🚀
