const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const pool = require('./db');
const { hashPassword, comparePassword, generateToken, authenticateRequest } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8081'],
  credentials: true,
};

app.use(cors(corsOptions));

// Body parser (except for webhooks)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, name, subscription_status, subscription_tier, created_at`,
      [email.toLowerCase(), passwordHash, name]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscription_status,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const result = await pool.query(
      'SELECT id, email, name, password_hash, subscription_status, subscription_tier, stripe_customer_id, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check password
    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscription_status,
        subscriptionTier: user.subscription_tier,
        subscriptionId: user.stripe_customer_id,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateRequest, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      subscriptionStatus: req.user.subscription_status,
      subscriptionTier: req.user.subscription_tier,
      mastersThisMonth: req.user.masters_this_month,
    },
  });
});

// ============================================
// STRIPE SUBSCRIPTION ENDPOINTS
// ============================================

// Create checkout session
app.post('/api/stripe/create-checkout-session', authenticateRequest, async (req, res) => {
  const { priceId } = req.body;

  try {
    const user = req.user;

    // Create or get Stripe customer
    let customerId = null;
    
    const dbUser = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
    customerId = dbUser.rows[0].stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.id]);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        userId: user.id,
      },
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
app.post('/api/stripe/create-portal-session', authenticateRequest, async (req, res) => {
  try {
    const user = req.user;
    
    const dbUser = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
    const customerId = dbUser.rows[0].stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get subscription status
app.get('/api/subscription/status', authenticateRequest, async (req, res) => {
  try {
    const user = req.user;

    const result = await pool.query(
      `SELECT s.*, u.masters_this_month, u.subscription_tier
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE u.id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        subscription: null,
        tier: 'free',
        mastersThisMonth: user.masters_this_month || 0,
      });
    }

    const subscription = result.rows[0];

    res.json({
      success: true,
      subscription: {
        id: subscription.stripe_subscription_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      tier: subscription.subscription_tier,
      mastersThisMonth: subscription.masters_this_month,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// ============================================
// USAGE TRACKING ENDPOINTS
// ============================================

// Check if user can master audio
app.get('/api/usage/check-limit', authenticateRequest, async (req, res) => {
  try {
    const user = req.user;

    // Get user's current usage
    const result = await pool.query(
      'SELECT subscription_tier, masters_this_month, last_reset_date FROM users WHERE id = $1',
      [user.id]
    );

    const userData = result.rows[0];

    // Define limits per tier
    const limits = {
      free: 1, // Free trial: 1 master only
      pro: 999999, // Pro: Unlimited
    };

    const tier = userData.subscription_tier || 'free';
    const limit = limits[tier];
    const used = userData.masters_this_month || 0;
    const canMaster = used < limit;

    res.json({
      success: true,
      canMaster,
      used,
      limit,
      remaining: limit - used,
      tier,
    });
  } catch (error) {
    console.error('Check limit error:', error);
    res.status(500).json({ error: 'Failed to check limit' });
  }
});

// Increment usage counter
app.post('/api/usage/increment', authenticateRequest, async (req, res) => {
  const { genre, tempo, duration, filename } = req.body;

  try {
    const user = req.user;

    // Check limit first
    const checkResult = await pool.query(
      'SELECT subscription_tier, masters_this_month FROM users WHERE id = $1',
      [user.id]
    );

    const userData = checkResult.rows[0];
    const limits = { free: 1, pro: 999999 }; // Free: 1 master, Pro: unlimited
    const limit = limits[userData.subscription_tier || 'free'];

    if (userData.masters_this_month >= limit) {
      return res.status(403).json({ error: 'Monthly limit reached' });
    }

    // Increment counter
    await pool.query(
      'UPDATE users SET masters_this_month = masters_this_month + 1, masters_total = masters_total + 1 WHERE id = $1',
      [user.id]
    );

    // Log the audio file
    await pool.query(
      `INSERT INTO audio_files (user_id, original_filename, genre, tempo, duration)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, filename, genre, tempo, duration]
    );

    res.json({
      success: true,
      mastersThisMonth: userData.masters_this_month + 1,
    });
  } catch (error) {
    console.error('Increment usage error:', error);
    res.status(500).json({ error: 'Failed to increment usage' });
  }
});

// Get user's audio history
app.get('/api/usage/history', authenticateRequest, async (req, res) => {
  try {
    const user = req.user;

    const result = await pool.query(
      `SELECT id, original_filename, genre, tempo, duration, status, created_at
       FROM audio_files
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    res.json({
      success: true,
      files: result.rows,
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// ============================================
// STRIPE WEBHOOKS
// ============================================

app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📨 Webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('✅ Payment succeeded');
        break;

      case 'invoice.payment_failed':
        console.log('❌ Payment failed');
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook handlers
async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  console.log('✅ Checkout completed for user:', userId);

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // All subscriptions are Pro tier now
  const tier = 'pro';

  // Update user
  await pool.query(
    'UPDATE users SET stripe_customer_id = $1, subscription_status = $2, subscription_tier = $3 WHERE id = $4',
    [customerId, subscription.status, tier, userId]
  );

  // Create subscription record
  await pool.query(
    `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6))
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       status = $4, current_period_start = to_timestamp($5), current_period_end = to_timestamp($6)`,
    [
      userId,
      subscriptionId,
      subscription.items.data[0].price.id,
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
    ]
  );
}

async function handleSubscriptionUpdate(subscription) {
  const subscriptionId = subscription.id;

  console.log('🔄 Subscription updated:', subscriptionId);

  // All subscriptions are Pro tier now
  const tier = 'pro';

  // Update subscription
  await pool.query(
    `UPDATE subscriptions SET
       status = $1,
       current_period_start = to_timestamp($2),
       current_period_end = to_timestamp($3),
       cancel_at_period_end = $4
     WHERE stripe_subscription_id = $5`,
    [
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.cancel_at_period_end,
      subscriptionId,
    ]
  );

  // Update user
  await pool.query(
    `UPDATE users SET
       subscription_status = $1,
       subscription_tier = $2
     WHERE stripe_customer_id = $3`,
    [subscription.status, tier, subscription.customer]
  );
}

async function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id;

  console.log('❌ Subscription deleted:', subscriptionId);

  // Update subscription
  await pool.query(
    "UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = $1",
    [subscriptionId]
  );

  // Update user to free tier
  await pool.query(
    "UPDATE users SET subscription_status = 'canceled', subscription_tier = 'free' WHERE stripe_customer_id = $1",
    [subscription.customer]
  );
}

async function handlePaymentFailed(invoice) {
  console.log('❌ Payment failed for subscription:', invoice.subscription);
  
  // Update user status
  await pool.query(
    "UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1",
    [invoice.customer]
  );
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
  🚀 Clickmaster ProLite Backend Server
  ================================
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
  Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}
  ================================
  `);
});
