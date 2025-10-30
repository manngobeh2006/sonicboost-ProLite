-- SonicBoost ProLite Database Schema for Supabase Auth
-- Run this in your Supabase SQL Editor

-- Users table (profiles - auth handled by Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'free',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_id VARCHAR(255),
  enhancements_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio enhancement history table
CREATE TABLE IF NOT EXISTS audio_enhancement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  genre VARCHAR(100),
  tempo INTEGER,
  duration FLOAT,
  filename VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to increment enhancements count
CREATE OR REPLACE FUNCTION increment_enhancements(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET enhancements_this_month = enhancements_this_month + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly counters (run via cron job on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_enhancements()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET enhancements_this_month = 0,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_audio_enhancement_history_user_id ON audio_enhancement_history(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_enhancement_history_created_at ON audio_enhancement_history(created_at);

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_enhancement_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for audio_enhancement_history table
CREATE POLICY "Users can view own history"
  ON audio_enhancement_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON audio_enhancement_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Stripe webhook idempotency table
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- One-time purchase orders
CREATE TABLE IF NOT EXISTS one_time_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'created', -- created | paid | canceled
  stripe_session_id TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_time_orders_user ON one_time_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_orders_session ON one_time_orders(stripe_session_id);
