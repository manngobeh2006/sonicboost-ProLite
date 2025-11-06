-- =====================================================
-- VERIFY USER CREATION TRIGGER
-- =====================================================

-- 1. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- 3. List all users in auth.users (to see if signup worked)
SELECT 
  id,
  email,
  created_at,
  confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. List all users in public.users (to see if trigger created profiles)
SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- WHAT TO LOOK FOR:
-- =====================================================
-- 1. Trigger should exist on auth.users table
-- 2. Function should exist and be SECURITY DEFINER
-- 3. Count of auth.users should match public.users
-- 4. If counts don't match, trigger may not be working
-- =====================================================
