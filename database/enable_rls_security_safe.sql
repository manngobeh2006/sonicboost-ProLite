-- =====================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) ENABLEMENT
-- SAFE VERSION - Checks for table existence first
-- =====================================================
-- Purpose: Enable RLS on all existing public tables
-- Author: Senior Database Engineer
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON EXISTING TABLES ONLY
-- =====================================================

-- Enable RLS on users table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on users table';
  ELSE
    RAISE NOTICE 'users table does not exist - skipping';
  END IF;
END $$;

-- Enable RLS on audio_enhancement_history table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audio_enhancement_history') THEN
    ALTER TABLE public.audio_enhancement_history ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on audio_enhancement_history table';
  ELSE
    RAISE NOTICE 'audio_enhancement_history table does not exist - skipping';
  END IF;
END $$;

-- Enable RLS on one_time_orders table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'one_time_orders') THEN
    ALTER TABLE public.one_time_orders ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on one_time_orders table';
  ELSE
    RAISE NOTICE 'one_time_orders table does not exist - skipping';
  END IF;
END $$;

-- Enable RLS on stripe_events table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_events') THEN
    ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on stripe_events table';
  ELSE
    RAISE NOTICE 'stripe_events table does not exist - skipping';
  END IF;
END $$;

-- =====================================================
-- 2. DROP EXISTING POLICIES (IF ANY)
-- =====================================================

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;

DROP POLICY IF EXISTS "Users can read own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.audio_enhancement_history;
DROP POLICY IF EXISTS "Service role has full access to history" ON public.audio_enhancement_history;

DROP POLICY IF EXISTS "Users can read own orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.one_time_orders;
DROP POLICY IF EXISTS "Service role has full access to orders" ON public.one_time_orders;

DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_events;

-- =====================================================
-- 3. USERS TABLE POLICIES
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    -- Policy: Users can only read their own profile
    EXECUTE 'CREATE POLICY "Users can read own profile"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id)';

    -- Policy: Users can update their own profile
    EXECUTE 'CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id)';

    -- Policy: Service role has full access
    EXECUTE 'CREATE POLICY "Service role has full access to users"
    ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)';

    RAISE NOTICE 'Created policies for users table';
  END IF;
END $$;

-- =====================================================
-- 4. AUDIO_ENHANCEMENT_HISTORY TABLE POLICIES
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audio_enhancement_history') THEN
    -- Policy: Users can only read their own history
    EXECUTE 'CREATE POLICY "Users can read own history"
    ON public.audio_enhancement_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id)';

    -- Policy: Users can insert their own history
    EXECUTE 'CREATE POLICY "Users can insert own history"
    ON public.audio_enhancement_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id)';

    -- Policy: Users can update their own history
    EXECUTE 'CREATE POLICY "Users can update own history"
    ON public.audio_enhancement_history
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id)';

    -- Policy: Users can delete their own history
    EXECUTE 'CREATE POLICY "Users can delete own history"
    ON public.audio_enhancement_history
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id)';

    -- Policy: Service role has full access
    EXECUTE 'CREATE POLICY "Service role has full access to history"
    ON public.audio_enhancement_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)';

    RAISE NOTICE 'Created policies for audio_enhancement_history table';
  END IF;
END $$;

-- =====================================================
-- 5. ONE_TIME_ORDERS TABLE POLICIES (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'one_time_orders') THEN
    -- Policy: Users can only read their own orders
    EXECUTE 'CREATE POLICY "Users can read own orders"
    ON public.one_time_orders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id)';

    -- Policy: Users can insert their own orders
    EXECUTE 'CREATE POLICY "Users can insert own orders"
    ON public.one_time_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id)';

    -- Policy: Service role has full access
    EXECUTE 'CREATE POLICY "Service role has full access to orders"
    ON public.one_time_orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)';

    RAISE NOTICE 'Created policies for one_time_orders table';
  END IF;
END $$;

-- =====================================================
-- 6. STRIPE_EVENTS TABLE POLICIES (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stripe_events') THEN
    -- Policy: Only service role can manage Stripe events
    EXECUTE 'CREATE POLICY "Service role can manage stripe events"
    ON public.stripe_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true)';

    RAISE NOTICE 'Created policies for stripe_events table';
  END IF;
END $$;

-- =====================================================
-- 7. GRANT APPROPRIATE PERMISSIONS
-- =====================================================

-- Grant authenticated users access to tables they need
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audio_enhancement_history') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_enhancement_history TO authenticated;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'one_time_orders') THEN
    GRANT SELECT, INSERT ON public.one_time_orders TO authenticated;
  END IF;
END $$;

-- Service role gets full access (already has it by default)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

-- Show which tables now have RLS enabled
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show all policies created
SELECT 
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- COMPLETE
-- =====================================================
-- RLS is now enabled on all existing tables!
-- Your database is now secure.
-- =====================================================
