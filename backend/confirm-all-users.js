const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// For admin operations, we need the service role key
// If you don't have it, you'll need to disable email confirmation in Supabase settings
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('⚠️  SUPABASE_SERVICE_KEY not found in .env file');
  console.log('\n📝 To fix the "Email not confirmed" error, you have 2 options:\n');
  console.log('Option 1: Disable email confirmation (Recommended for development)');
  console.log('  1. Go to your Supabase Dashboard');
  console.log('  2. Navigate to Authentication > Settings');
  console.log('  3. Find "Enable email confirmations"');
  console.log('  4. Turn it OFF');
  console.log('  5. Try logging in again\n');
  console.log('Option 2: Add SUPABASE_SERVICE_KEY to your .env file');
  console.log('  1. Go to your Supabase Dashboard');
  console.log('  2. Navigate to Settings > API');
  console.log('  3. Copy the "service_role" key');
  console.log('  4. Add to .env: SUPABASE_SERVICE_KEY=your-service-key');
  console.log('  5. Run this script again\n');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmAllUsers() {
  try {
    console.log('🔍 Fetching all users from Supabase Auth...\n');

    // Get all users (requires service_role key)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found in Supabase Auth');
      return;
    }

    console.log(`📊 Found ${users.length} users\n`);

    let confirmedCount = 0;
    let alreadyConfirmedCount = 0;

    for (const user of users) {
      const emailConfirmedAt = user.email_confirmed_at;
      const isConfirmed = !!emailConfirmedAt;

      console.log(`👤 ${user.email}`);
      console.log(`   Status: ${isConfirmed ? '✅ Already confirmed' : '⏳ Not confirmed'}`);

      if (!isConfirmed) {
        // Update user to confirm email
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.log(`   ❌ Error confirming: ${updateError.message}`);
        } else {
          console.log(`   ✅ Email confirmed!`);
          confirmedCount++;
        }
      } else {
        alreadyConfirmedCount++;
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log(`✅ Confirmation complete!`);
    console.log(`   - ${alreadyConfirmedCount} already confirmed`);
    console.log(`   - ${confirmedCount} newly confirmed`);
    console.log(`   - Total: ${users.length} users`);
    console.log('\n🎉 You should now be able to log in!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the confirmation
confirmAllUsers();
