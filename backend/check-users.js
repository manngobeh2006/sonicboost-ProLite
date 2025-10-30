const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');

    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, subscription_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) {
      console.log('❌ Error fetching users from public.users table:', usersError.message);
    } else {
      console.log('📊 Users in public.users table:', users?.length || 0);
      if (users && users.length > 0) {
        users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} (${user.name}) - Created: ${new Date(user.created_at).toLocaleString()}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('🔐 To test login, you need to:');
    console.log('1. Sign up through the app (this will create a user in Supabase Auth)');
    console.log('2. Or create a user in Supabase Dashboard > Authentication > Users');
    console.log('\n📱 Try signing up with a new account in the app!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkUsers();
