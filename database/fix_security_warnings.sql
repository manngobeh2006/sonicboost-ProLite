-- =====================================================
-- FIX DATABASE SECURITY WARNINGS
-- =====================================================
-- Purpose: Fix all function search_path security issues
-- Author: Senior Database Engineer
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- 1. FIX FUNCTION SEARCH_PATH ISSUES
-- =====================================================

-- Fix: update_updated_at_column function (trigger function)
ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public;

-- Fix: increment_enhancements function (with parameter)
ALTER FUNCTION public.increment_enhancements(uuid) 
SET search_path = public;

-- Fix: reset_monthly_enhancements function
ALTER FUNCTION public.reset_monthly_enhancements() 
SET search_path = public;

-- Fix: increment_masters function (legacy - if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_masters' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE 'ALTER FUNCTION public.increment_masters(uuid) SET search_path = public';
    RAISE NOTICE '✅ Fixed increment_masters function';
  ELSE
    RAISE NOTICE 'ℹ️  increment_masters function does not exist (already cleaned up)';
  END IF;
END $$;

-- Fix: reset_monthly_masters function (legacy - if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reset_monthly_masters' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE 'ALTER FUNCTION public.reset_monthly_masters() SET search_path = public';
    RAISE NOTICE '✅ Fixed reset_monthly_masters function';
  ELSE
    RAISE NOTICE 'ℹ️  reset_monthly_masters function does not exist (already cleaned up)';
  END IF;
END $$;

-- Fix: is_user_subscribed function (RLS helper - if exists)
-- Note: Only run if you've run the RLS security script
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_user_subscribed' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE 'ALTER FUNCTION public.is_user_subscribed(uuid) SET search_path = public';
    RAISE NOTICE '✅ Fixed is_user_subscribed function';
  ELSE
    RAISE NOTICE 'ℹ️  is_user_subscribed function does not exist (this is OK)';
  END IF;
END $$;

-- =====================================================
-- 2. VERIFICATION
-- =====================================================

-- Verify all functions now have search_path set
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  proconfig as config,
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig) 
    THEN '✅ FIXED'
    ELSE '❌ NEEDS FIX'
  END as status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'update_updated_at_column',
    'increment_enhancements',
    'reset_monthly_enhancements',
    'increment_masters',
    'reset_monthly_masters',
    'is_user_subscribed'
  )
ORDER BY proname;

-- =====================================================
-- COMPLETE
-- =====================================================
-- All function security warnings fixed!
-- Run this script in Supabase SQL Editor
-- =====================================================
