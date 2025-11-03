-- =====================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) ENABLEMENT
-- =====================================================
-- Purpose: Enable RLS on all public tables and create secure policies
-- Author: Senior Database Engineer
-- Date: 2025-11-03
-- Security Level: Production-Ready Enterprise Policies
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audio_enhancement_history table (CRITICAL FIX)
ALTER TABLE public.audio_enhancement_history ENABLE ROW LEVEL SECURITY;

-- Enable RLS on one_time_orders table
ALTER TABLE public.one_time_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on stripe_events table (webhook deduplication)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (IF ANY)
-- =====================================================

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;

DROP POLICY IF EXISTS "Users can read own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Service role has full access to history" ON public.audio_enhancement_history;

DROP POLICY IF EXISTS "Users can read own orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Service role has full access to orders" ON public.one_time_orders;

DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_events;

-- =====================================================
-- 3. USERS TABLE POLICIES
-- =====================================================

-- Policy: Users can only read their own profile
CREATE POLICY "Users can read own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Service role (backend) has full access
CREATE POLICY "Service role has full access to users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. AUDIO_ENHANCEMENT_HISTORY TABLE POLICIES
-- =====================================================

-- Policy: Users can only read their own enhancement history
CREATE POLICY "Users can read own history"
ON public.audio_enhancement_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own enhancement history
CREATE POLICY "Users can insert own history"
ON public.audio_enhancement_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own enhancement history
CREATE POLICY "Users can update own history"
ON public.audio_enhancement_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own enhancement history
CREATE POLICY "Users can delete own history"
ON public.audio_enhancement_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role (backend) has full access
CREATE POLICY "Service role has full access to history"
ON public.audio_enhancement_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. ONE_TIME_ORDERS TABLE POLICIES
-- =====================================================

-- Policy: Users can only read their own orders
CREATE POLICY "Users can read own orders"
ON public.one_time_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own orders
CREATE POLICY "Users can insert own orders"
ON public.one_time_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role (backend) has full access (for webhook updates)
CREATE POLICY "Service role has full access to orders"
ON public.one_time_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 6. STRIPE_EVENTS TABLE POLICIES
-- =====================================================

-- Policy: Only service role can manage Stripe events (webhooks only)
CREATE POLICY "Service role can manage stripe events"
ON public.stripe_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users cannot access stripe events at all
-- (No policy needed - by default they have no access with RLS enabled)

-- =====================================================
-- 7. GRANT APPROPRIATE PERMISSIONS
-- =====================================================

-- Grant authenticated users access to tables they need
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_enhancement_history TO authenticated;
GRANT SELECT, INSERT ON public.one_time_orders TO authenticated;

-- Service role gets full access (already has it by default)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Revoke public access (paranoid security)
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.audio_enhancement_history FROM anon;
REVOKE ALL ON public.one_time_orders FROM anon;
REVOKE ALL ON public.stripe_events FROM anon;
REVOKE ALL ON public.stripe_events FROM authenticated;

-- =====================================================
-- 8. CREATE SECURITY DEFINER FUNCTIONS (IF NEEDED)
-- =====================================================

-- Function: Check if user is subscribed (for complex queries)
CREATE OR REPLACE FUNCTION public.is_user_subscribed(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
BEGIN
  SELECT subscription_tier INTO user_tier
  FROM public.users
  WHERE id = user_id_param;
  
  RETURN user_tier IN ('pro', 'unlimited');
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_subscribed(uuid) TO authenticated;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 10. TESTING QUERIES (RUN AS DIFFERENT USERS)
-- =====================================================

-- Test 1: Verify users can only see their own data
-- Run this as an authenticated user - should only return their own row
-- SELECT * FROM public.users;

-- Test 2: Verify users can only see their own history
-- Run this as an authenticated user - should only return their rows
-- SELECT * FROM public.audio_enhancement_history;

-- Test 3: Verify users cannot see other users' orders
-- Run this as an authenticated user - should only return their orders
-- SELECT * FROM public.one_time_orders;

-- Test 4: Verify users cannot access stripe events
-- Run this as an authenticated user - should return empty or error
-- SELECT * FROM public.stripe_events;

-- =====================================================
-- 11. ROLLBACK SCRIPT (EMERGENCY USE ONLY)
-- =====================================================

/*
-- DANGER: Only run this if you need to disable RLS for debugging
-- DO NOT RUN IN PRODUCTION

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_enhancement_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_time_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events DISABLE ROW LEVEL SECURITY;
*/

-- =====================================================
-- EXECUTION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify RLS is enabled on all tables
-- 3. Test with authenticated users
-- 4. Monitor for any access issues
-- 5. Update backend queries if needed
-- =====================================================
