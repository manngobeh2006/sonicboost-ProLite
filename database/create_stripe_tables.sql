-- =====================================================
-- CREATE STRIPE TABLES
-- =====================================================
-- Purpose: Create one_time_orders and stripe_events tables
-- Run this FIRST, then run complete_rls_setup.sql
-- =====================================================

-- =====================================================
-- 1. CREATE STRIPE_EVENTS TABLE (webhook deduplication)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_received_at ON public.stripe_events(received_at);

-- =====================================================
-- 2. CREATE ONE_TIME_ORDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.one_time_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'created', -- created | paid | canceled
  stripe_session_id TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_one_time_orders_user ON public.one_time_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_orders_session ON public.one_time_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_one_time_orders_status ON public.one_time_orders(status);
CREATE INDEX IF NOT EXISTS idx_one_time_orders_created_at ON public.one_time_orders(created_at);

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- Check tables were created
SELECT 
  table_name,
  '✅ CREATED' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('stripe_events', 'one_time_orders')
ORDER BY table_name;

-- =====================================================
-- SUCCESS! ✅
-- =====================================================
-- Tables created. Now run complete_rls_setup.sql
-- =====================================================
