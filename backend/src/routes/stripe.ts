import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../services/supabase';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Rate limiting for checkout endpoints
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { success: false, error: 'Too many checkout requests, please try again later' }
});

// Input validation schemas
const checkoutSessionSchema = z.object({
  priceId: z.string().min(1)
});

const oneTimeCheckoutSchema = z.object({
  filename: z.string().optional(),
  amountCents: z.number().int().min(100),
  currency: z.string().optional().default('usd')
});

// Create checkout session
router.post('/create-checkout-session', checkoutLimiter, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validation = checkoutSessionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid request data' });
      return;
    }

    const { priceId } = validation.data;
    const userId = req.user!.userId;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: process.env.APP_URL || 'https://example.com/payment-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.APP_URL || 'https://example.com/payment-cancel',
      client_reference_id: userId,
      metadata: {
        userId,
      },
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    // Always show detailed error to help debugging
    const errorMessage = error.message || 'Failed to create checkout session';
    res.status(500).json({ success: false, error: errorMessage, details: error.type });
  }
});

// Create one-time payment checkout session
router.post('/one-time-checkout', checkoutLimiter, authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validation = oneTimeCheckoutSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Invalid request data' });
      return;
    }

    const { filename, amountCents, currency } = validation.data;

    // Create order record
    const { data: order, error: orderErr } = await supabase
      .from('one_time_orders')
      .insert({
        user_id: req.user!.userId,
        filename,
        amount_cents: amountCents,
        currency,
        status: 'created',
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create Stripe Checkout Session (one-time payment)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: 'SonicBoost One-Time Download',
              description: filename || 'Processed audio',
            },
          },
          quantity: 1,
        },
      ],
      success_url: process.env.APP_URL ? `${process.env.APP_URL}?order_id=${order.id}` : `https://example.com/payment-success?order_id=${order.id}`,
      cancel_url: process.env.APP_URL || 'https://example.com/payment-cancel',
      client_reference_id: req.user!.userId,
      metadata: {
        userId: req.user!.userId,
        orderId: order.id,
        filename: filename || '',
      },
    });

    // Save session id
    await supabase
      .from('one_time_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    res.json({ success: true, sessionId: session.id, url: session.url, orderId: order.id });
  } catch (error: any) {
    console.error('One-time checkout error:', error);
    const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to create checkout';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Create portal session
router.post('/create-portal-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    console.log('[Portal] Creating portal session for user:', userId);

    // Get user's subscription
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_id, subscription_tier, subscription_status, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Portal] Failed to fetch user:', userError);
      res.status(500).json({ success: false, error: 'Failed to fetch user data' });
      return;
    }

    console.log('[Portal] User data:', { 
      subscription_id: user.subscription_id,
      tier: user.subscription_tier,
      status: user.subscription_status 
    });

    if (!user?.subscription_id) {
      console.log('[Portal] No subscription ID found');
      res.status(400).json({ success: false, error: 'No active subscription found. Please subscribe to a plan first.' });
      return;
    }

    // Get customer ID from subscription
    console.log('[Portal] Retrieving Stripe subscription:', user.subscription_id);
    const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
    console.log('[Portal] Subscription customer:', subscription.customer);

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,
      return_url: `${process.env.APP_URL || 'https://example.com'}/profile`,
    });

    console.log('[Portal] Portal session created successfully');

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error('[Portal] Error:', error);
    console.error('[Portal] Error type:', error.type);
    console.error('[Portal] Error code:', error.code);
    const errorMessage = error.message || 'Failed to create portal session';
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.type : undefined
    });
  }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send('Missing signature');
    return;
  }

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Check for duplicate webhook events (idempotency)
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .single();

    if (existingEvent) {
      // Already processed this event
      res.json({ received: true });
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;

        if (session.mode === 'subscription' && userId && session.subscription) {
          await supabase
            .from('users')
            .update({
              subscription_id: session.subscription as string,
              subscription_status: 'active',
            })
            .eq('id', userId);
        }

        // One-time payment success
        if (session.mode === 'payment') {
          const orderId = session.metadata?.orderId;
          const paymentIntentId = session.payment_intent as string | undefined;
          if (orderId) {
            await supabase
              .from('one_time_orders')
              .update({ status: 'paid', payment_intent_id: paymentIntentId || null })
              .eq('id', orderId);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find user by subscription ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('subscription_id', subscription.id)
          .single();

        if (user) {
          const tier = subscription.status === 'active'
            ? (subscription.items.data[0]?.price.id === process.env.STRIPE_UNLIMITED_PRICE_ID ? 'unlimited' : 'pro')
            : 'free';

          await supabase
            .from('users')
            .update({
              subscription_status: subscription.status,
              subscription_tier: tier,
            })
            .eq('id', user.id);
        }
        break;
      }
    }

    // Save event to prevent duplicate processing
    await supabase
      .from('stripe_events')
      .insert({
        id: event.id,
        type: event.type
      });

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
