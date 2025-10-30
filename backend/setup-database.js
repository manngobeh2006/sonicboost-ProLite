const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database schema...');
    
    // SQL schema to create tables
    const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (syncs with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'free',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_id VARCHAR(255),
  enhancements_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mastering history table
CREATE TABLE IF NOT EXISTS mastering_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  genre VARCHAR(100),
  tempo INTEGER,
  duration FLOAT,
  filename VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to increment masters count
CREATE OR REPLACE FUNCTION increment_masters(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET masters_this_month = masters_this_month + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly counters (run via cron job on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_masters()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET masters_this_month = 0,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_mastering_history_user_id ON mastering_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mastering_history_created_at ON mastering_history(created_at);

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
`;

    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('❌ Database setup error:', error);
      process.exit(1);
    }
    
    console.log('✅ Database schema created successfully!');
    console.log('📊 Tables created: users, mastering_history');
    console.log('🔧 Functions created: increment_masters, reset_monthly_masters');
    console.log('📈 Indexes created for better performance');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();

