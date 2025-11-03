-- =====================================================
-- COMPLETE RLS SETUP - Missing Tables
-- =====================================================
-- Purpose: Add RLS to one_time_orders and stripe_events
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON MISSING TABLES
-- =====================================================

-- Enable RLS on one_time_orders (if not already)
ALTER TABLE IF EXISTS public.one_time_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on stripe_events (if not already)
ALTER TABLE IF EXISTS public.stripe_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP EXISTING POLICIES (clean slate)
-- =====================================================

DROP POLICY IF EXISTS "Users can read own orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Service role has full access to orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_events;

-- =====================================================
-- 3. ONE_TIME_ORDERS POLICIES
-- =====================================================

-- Users can only read their own orders
CREATE POLICY "Users can read own orders"
ON public.one_time_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can insert own orders"
ON public.one_time_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Backend (service_role) has full access for webhooks
CREATE POLICY "Service role has full access to orders"
ON public.one_time_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. STRIPE_EVENTS POLICIES
-- =====================================================

-- Only backend can manage Stripe webhook events
-- No user access at all (for security)
CREATE POLICY "Service role can manage stripe events"
ON public.stripe_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Users can SELECT and INSERT on their orders
GRANT SELECT, INSERT ON public.one_time_orders TO authenticated;

-- Service role gets full access
GRANT ALL ON public.one_time_orders TO service_role;
GRANT ALL ON public.stripe_events TO service_role;

-- Revoke all access to stripe_events from users (security)
REVOKE ALL ON public.stripe_events FROM authenticated;
REVOKE ALL ON public.stripe_events FROM anon;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Check RLS is enabled
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('one_time_orders', 'stripe_events');

-- Check policies exist
SELECT 
  tablename,
  policyname,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('one_time_orders', 'stripe_events')
ORDER BY tablename, policyname;

-- =====================================================
-- SUCCESS! ✅
-- =====================================================
-- All tables now have RLS enabled with proper policies
-- =====================================================
