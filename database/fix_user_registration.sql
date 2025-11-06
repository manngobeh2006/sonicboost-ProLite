-- =====================================================
-- FIX USER REGISTRATION RLS POLICY
-- =====================================================
-- Problem: RLS blocks new user creation during signup
-- Solution: Allow INSERT for authenticated users
-- =====================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own record during signup" ON public.users;

-- Create proper INSERT policy that allows user creation
CREATE POLICY "Users can insert own record during signup"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'INSERT';

-- =====================================================
-- SUCCESS! ✅
-- =====================================================
-- Run this in Supabase SQL Editor
-- Then try creating a new user again
-- =====================================================
