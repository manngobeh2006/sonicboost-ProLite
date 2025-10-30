-- SonicBoost ProLite Database Schema (Updated with Audio Enhancement terminology)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'free',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_id VARCHAR(255),
  enhancements_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio enhancement history table
CREATE TABLE IF NOT EXISTS audio_enhancement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
