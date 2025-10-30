import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../services/supabase';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { priceId } = req.body;
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
      success_url: `${process.env.APP_URL || 'myapp://'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'myapp://'}?canceled=true`,
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create one-time payment checkout session
router.post('/one-time-checkout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, amountCents, currency = 'usd' } = req.body as { filename: string; amountCents: number; currency?: string };

    if (!amountCents || amountCents < 100) {
      res.status(400).json({ success: false, error: 'Invalid amount' });
      return;
    }

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
      success_url: `${process.env.APP_URL || 'myapp://'}?status=success&order_id=${order.id}`,
      cancel_url: `${process.env.APP_URL || 'myapp://'}?status=cancelled&order_id=${order.id}`,
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create portal session
router.post('/create-portal-session', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get user's subscription
    const { data: user } = await supabase
      .from('users')
      .select('subscription_id')
      .eq('id', userId)
      .single();

    if (!user?.subscription_id) {
      res.status(400).json({ success: false, error: 'No active subscription' });
      return;
    }

    // Get customer ID from subscription
    const subscription = await stripe.subscriptions.retrieve(user.subscription_id);

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,
      return_url: process.env.APP_URL || 'myapp://',
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({ success: false, error: error.message });
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
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

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

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
