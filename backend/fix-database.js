const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabase() {
  try {
    console.log('🔍 Checking current users table structure...');

    // Check if users table exists
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('*')
      .limit(0);

    if (tablesError) {
      console.log('❌ Error checking users table:', tablesError.message);
      if (tablesError.message.includes('relation "public.users" does not exist')) {
        console.log('📝 Creating users table...');
        // We'll need to use the SQL editor or Supabase dashboard for this
        console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor:');
        console.log(`
-- Create users table that syncs with Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
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

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow inserting new users (for service role)
CREATE POLICY "Service role can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON public.users(subscription_id);
        `);
      }
      return;
    }

    console.log('✅ Users table exists');

    // Try to query the structure by selecting all columns
    const { data: sampleUsers, error: queryError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (queryError) {
      console.log('❌ Error querying users:', queryError.message);
    } else {
      console.log('📊 Sample user structure:', sampleUsers && sampleUsers.length > 0 ? Object.keys(sampleUsers[0]) : 'No users yet');
    }

    // Check if password_hash column exists by trying to select it
    const { error: passwordHashError } = await supabase
      .from('users')
      .select('password_hash')
      .limit(1);

    if (passwordHashError) {
      if (passwordHashError.message.includes('password_hash')) {
        console.log('✅ Good! password_hash column does not exist (as expected for Supabase Auth)');
      } else {
        console.log('⚠️  Query error:', passwordHashError.message);
      }
    } else {
      console.log('⚠️  WARNING: password_hash column exists!');
      console.log('\n📝 Please run this SQL in your Supabase SQL Editor to remove it:');
      console.log('ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;');
    }

    console.log('\n✅ Database check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
fixDatabase();
