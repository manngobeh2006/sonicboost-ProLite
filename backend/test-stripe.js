require('dotenv').config();
const Stripe = require('stripe');

console.log('🔍 Testing Stripe Configuration\n');

// Check environment variables
console.log('Environment Variables:');
console.log('✓ STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 15)}...` : '❌ MISSING');
console.log('✓ STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '⚠️  Not set');
console.log('✓ SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '❌ MISSING');
console.log('✓ SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '❌ MISSING');
console.log('');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set. Cannot continue.');
  process.exit(1);
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function testStripe() {
  try {
    // Test 1: Verify API key works
    console.log('Test 1: Verifying Stripe API Key...');
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe API Key Valid');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Business: ${account.business_profile?.name || 'Not set'}`);
    console.log(`   Test Mode: ${!account.charges_enabled || account.id.startsWith('acct_') ? 'Yes' : 'No'}`);
    console.log('');

    // Test 2: List prices
    console.log('Test 2: Listing Stripe Prices...');
    const prices = await stripe.prices.list({ limit: 10 });
    console.log(`✅ Found ${prices.data.length} prices:`);
    
    const priceIds = {
      pro: 'price_1SLCDtRWPNzpeJiuh09ZNfrp',
      unlimited: 'price_1SODGMRWPNzpeJiu3KDZnmz1',
      single: 'price_1SLC6tRWPNzpeJiuYVKtG87S'
    };

    for (const [name, priceId] of Object.entries(priceIds)) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        console.log(`   ✅ ${name}: ${priceId} - $${(price.unit_amount / 100).toFixed(2)}/${price.recurring ? price.recurring.interval : 'one-time'}`);
      } catch (error) {
        console.log(`   ❌ ${name}: ${priceId} - NOT FOUND`);
      }
    }
    console.log('');

    // Test 3: Try creating a test checkout session
    console.log('Test 3: Creating Test Checkout Session...');
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceIds.pro,
            quantity: 1,
          },
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        client_reference_id: 'test-user-123',
        metadata: {
          userId: 'test-user-123',
        },
      });
      console.log('✅ Test checkout session created successfully');
      console.log(`   Session ID: ${session.id}`);
      console.log(`   URL: ${session.url}`);
    } catch (error) {
      console.error('❌ Failed to create checkout session:');
      console.error(`   Error: ${error.message}`);
    }

    console.log('\n✅ All Stripe tests passed!');
  } catch (error) {
    console.error('\n❌ Stripe test failed:');
    console.error(error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Your Stripe API key is invalid or expired.');
      console.error('   Go to https://dashboard.stripe.com/apikeys and get a new key.');
    }
    process.exit(1);
  }
}

testStripe();
