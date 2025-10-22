# 💳 Integrating Stripe Payments - Complete Guide

## Overview

To integrate real Stripe payments into your AudioMaster app, you'll need both **frontend** (React Native) and **backend** (server) components. Here's the complete roadmap.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Native App (Frontend)                │
│  • Display subscription plans                                │
│  • Collect payment info                                      │
│  • Show subscription status                                  │
│  • Handle payment UI                                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS API Calls
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Backend Server (Required)                 │
│  • Node.js/Express or Next.js                                │
│  • Create checkout sessions                                  │
│  • Handle webhooks                                           │
│  • Manage subscriptions                                      │
│  • Update user status                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Stripe API
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                         Stripe                               │
│  • Process payments                                          │
│  • Manage subscriptions                                      │
│  • Send webhooks                                             │
│  • Handle billing                                            │
└──────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for an account
3. Complete business verification
4. Get your API keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Set Up Backend Server
You **MUST** have a backend server for Stripe. You cannot use Stripe entirely from a mobile app for security reasons.

**Options:**
- **Node.js + Express** (recommended)
- **Next.js API routes**
- **Firebase Cloud Functions**
- **Supabase Edge Functions**
- **AWS Lambda**

## 🚀 Implementation Steps

## Step 1: Backend Setup (Node.js + Express)

### Install Dependencies
```bash
npm install express stripe dotenv cors body-parser
```

### Create Backend Server (`server.js`)
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Webhook endpoint (must be BEFORE bodyParser)
app.post('/webhook', 
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Update user subscription in database
        await updateUserSubscription(session);
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        // Update subscription status
        await handleSubscriptionUpdate(subscription);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        // Cancel user subscription
        await handleSubscriptionCancellation(deletedSubscription);
        break;
    }

    res.json({ received: true });
  }
);

// Create subscription checkout session
app.post('/create-checkout-session', async (req, res) => {
  const { priceId, userId, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // Stripe Price ID
          quantity: 1,
        },
      ],
      customer_email: email,
      client_reference_id: userId,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer portal session (for managing subscriptions)
app.post('/create-portal-session', async (req, res) => {
  const { customerId } = req.body;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscription status
app.get('/subscription/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Query your database for user's subscription
    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
app.post('/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Helper functions (implement based on your database)
async function updateUserSubscription(session) {
  // Update user in database with subscription details
  console.log('Update subscription:', session);
}

async function handleSubscriptionUpdate(subscription) {
  // Update subscription status in database
  console.log('Subscription updated:', subscription);
}

async function handleSubscriptionCancellation(subscription) {
  // Mark subscription as cancelled in database
  console.log('Subscription cancelled:', subscription);
}

async function getUserSubscription(userId) {
  // Query database for user subscription
  return { status: 'active', plan: 'pro' };
}
```

### Environment Variables (`.env`)
```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
CLIENT_URL=exp://192.168.1.100:8081
PORT=3000
```

## Step 2: Create Stripe Products & Prices

### In Stripe Dashboard:
1. Go to **Products** → **Add Product**
2. Create your subscription plans:

**Example Plans:**

**Free Plan** (No payment needed)
- Name: "Free"
- Price: $0/month
- Features: 5 masters/month

**Pro Plan**
- Name: "Pro"
- Price: $9.99/month
- Price ID: `price_abc123xyz`
- Features: 50 masters/month

**Enterprise Plan**
- Name: "Enterprise"
- Price: $29.99/month
- Price ID: `price_def456uvw`
- Features: Unlimited masters

3. Copy the **Price IDs** for each plan

## Step 3: Frontend Integration (React Native)

### Install Stripe SDK
```bash
npm install @stripe/stripe-react-native
```

### Update App.tsx
```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

export default function App() {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <StripeProvider publishableKey={publishableKey}>
      {/* Your existing app code */}
    </StripeProvider>
  );
}
```

### Create Subscription Plans Screen

**`src/screens/SubscriptionPlansScreen.tsx`**
```typescript
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { Linking } from 'react-native';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceId: null,
    features: [
      '5 masters per month',
      'Standard quality',
      'MP3 export only',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    priceId: 'price_abc123xyz', // Your Stripe Price ID
    popular: true,
    features: [
      '50 masters per month',
      'Premium quality',
      'MP3 + WAV export',
      'Priority support',
      'Genre detection',
      'Advanced settings',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$29.99',
    priceId: 'price_def456uvw', // Your Stripe Price ID
    features: [
      'Unlimited masters',
      'Studio quality',
      'All export formats',
      'VIP support',
      'API access',
      'Custom profiles',
      'Batch processing',
    ],
  },
];

export default function SubscriptionPlansScreen() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuthStore();

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      // Free plan - no payment needed
      return;
    }

    setLoading(planName);

    try {
      // Call your backend to create checkout session
      const response = await fetch('https://your-backend.com/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user?.id,
          email: user?.email,
        }),
      });

      const { url } = await response.json();

      // Open Stripe Checkout in browser
      await Linking.openURL(url);
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-8">
          <Text className="text-white text-3xl font-bold mb-2">
            Choose Your Plan
          </Text>
          <Text className="text-gray-400 text-base">
            Upgrade to unlock more features
          </Text>
        </View>

        {/* Plans */}
        <View className="px-6 pb-8">
          {PLANS.map((plan) => (
            <View
              key={plan.id}
              className={`mb-4 rounded-3xl p-6 border-2 ${
                plan.popular
                  ? 'bg-purple-600/10 border-purple-600'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              {plan.popular && (
                <View className="absolute -top-3 right-6 bg-purple-600 px-4 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">POPULAR</Text>
                </View>
              )}

              <Text className="text-white text-2xl font-bold mb-2">
                {plan.name}
              </Text>
              <View className="flex-row items-baseline mb-6">
                <Text className="text-white text-4xl font-bold">{plan.price}</Text>
                <Text className="text-gray-400 text-base ml-2">/month</Text>
              </View>

              {/* Features */}
              <View className="mb-6">
                {plan.features.map((feature, index) => (
                  <View key={index} className="flex-row items-center mb-3">
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text className="text-gray-300 text-sm ml-3">{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Subscribe Button */}
              <Pressable
                onPress={() => handleSubscribe(plan.priceId, plan.name)}
                disabled={loading === plan.name}
                className={`py-4 rounded-2xl items-center ${
                  plan.popular ? 'bg-purple-600' : 'bg-gray-800'
                }`}
              >
                {loading === plan.name ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-base font-semibold">
                    {plan.priceId ? 'Subscribe' : 'Current Plan'}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Update Profile Screen to Manage Subscription

Add to ProfileScreen:
```typescript
const handleManageSubscription = async () => {
  try {
    // Get Stripe Customer ID from your backend
    const response = await fetch(`https://your-backend.com/subscription/${user?.id}`);
    const { customerId } = await response.json();

    // Create portal session
    const portalResponse = await fetch('https://your-backend.com/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });

    const { url } = await portalResponse.json();

    // Open Stripe Customer Portal
    await Linking.openURL(url);
  } catch (error) {
    console.error('Error opening portal:', error);
    alert('Failed to open subscription management');
  }
};
```

## Step 4: Database Setup

You need a database to store:
- User subscription status
- Stripe Customer IDs
- Subscription IDs
- Usage limits

**Example Schema (PostgreSQL):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'free',
  subscription_id VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  masters_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(50),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Step 5: Set Up Webhooks

### In Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-backend.com/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** to your `.env`

## Step 6: Enforce Usage Limits

### Check Before Mastering
```typescript
// In MasteringScreen.tsx
const checkUsageLimit = async () => {
  const response = await fetch(`https://your-backend.com/check-limit/${user?.id}`);
  const { canMaster, remaining } = await response.json();
  
  if (!canMaster) {
    Alert.alert(
      'Limit Reached',
      `You've reached your monthly limit. Upgrade to continue mastering.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Subscriptions') }
      ]
    );
    return false;
  }
  
  return true;
};

const simulateAudioMastering = async () => {
  // Check limit first
  const canProceed = await checkUsageLimit();
  if (!canProceed) return;
  
  // Continue with mastering...
};
```

### Backend Endpoint
```javascript
app.get('/check-limit/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  
  const limits = {
    free: 5,
    pro: 50,
    enterprise: Infinity,
  };
  
  const limit = limits[user.subscription_tier];
  const canMaster = user.masters_this_month < limit;
  const remaining = limit - user.masters_this_month;
  
  res.json({ canMaster, remaining, limit });
});
```

## 🔒 Security Best Practices

1. **Never expose Secret Key** - Only use on backend
2. **Validate webhooks** - Always verify webhook signatures
3. **Use HTTPS** - Required for production
4. **Implement rate limiting** - Prevent abuse
5. **Store sensitive data securely** - Use environment variables
6. **Validate on server** - Never trust client-side data

## 💰 Pricing Strategy

### Recommended Tiers:

**Free**
- $0/month
- 5 masters/month
- Standard quality
- MP3 only
- Basic support

**Pro** (Most Popular)
- $9.99/month
- 50 masters/month
- Premium quality
- MP3 + WAV
- Priority support
- All features

**Enterprise**
- $29.99/month
- Unlimited masters
- Studio quality
- All formats
- VIP support
- API access

## 📊 Testing

### Test Mode
1. Use test API keys (`pk_test_...`, `sk_test_...`)
2. Test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any CVC

### Test Scenarios
- ✅ Successful subscription
- ✅ Failed payment
- ✅ Subscription cancellation
- ✅ Subscription renewal
- ✅ Webhook handling

## 🚀 Deployment

### Backend Options:
1. **Heroku** - Easy, free tier available
2. **Railway** - Modern, simple
3. **DigitalOcean** - Flexible
4. **AWS/Google Cloud** - Enterprise
5. **Vercel** - Great for Next.js

### Steps:
1. Deploy backend server
2. Set environment variables
3. Configure webhook URL in Stripe
4. Update mobile app with backend URL
5. Test in production mode
6. Submit app to stores

## 📱 App Store Considerations

### Apple App Store
- Must use **In-App Purchases** for iOS if selling digital goods
- Apple takes 30% commission (15% for < $1M revenue)
- **Alternative**: Sell subscriptions only on web, not in-app

### Google Play Store
- More flexible with payment methods
- Can use Stripe directly
- Google takes 15-30% if using Play Billing

### Recommendation:
Offer subscriptions through your **website**, then users log in to the app. This avoids app store fees.

## 💡 Next Steps

1. ✅ Set up Stripe account
2. ✅ Create backend server
3. ✅ Add subscription plans screen to app
4. ✅ Implement webhook handling
5. ✅ Set up database
6. ✅ Test thoroughly
7. ✅ Deploy to production
8. ✅ Submit app to stores

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Native](https://stripe.com/docs/stripe-react-native)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

**Need help with implementation? Let me know which part you'd like me to build first!**
