-- =====================================================
-- CHECK RLS STATUS
-- =====================================================
-- Purpose: Verify if RLS is enabled and policies exist
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Check which tables have RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'audio_enhancement_history', 'one_time_orders', 'stripe_events')
ORDER BY tablename;

-- 2. Check policies (should see multiple policies per table)
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd as operation,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ GOOD'
    ELSE '⚠️ CHECK NEEDED'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- INTERPRETATION:
-- =====================================================
-- If RLS shows "DISABLED" → You need to run enable_rls_security.sql
-- If policy_count is 0 or low → You need to run enable_rls_security.sql
-- If everything shows "ENABLED" and policies exist → RLS is configured ✅
-- =====================================================
