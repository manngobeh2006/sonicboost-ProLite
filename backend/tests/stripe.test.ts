import request from 'supertest';
import express from 'express';
import Stripe from 'stripe';
import stripeRouter from '../src/routes/stripe';

// Mock Stripe
jest.mock('stripe');
jest.mock('../src/services/supabase');

describe('Stripe Routes', () => {
  let app: express.Application;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    // Setup Express app with stripe routes
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware - bypass actual auth
    app.use((req: any, res, next) => {
      req.user = { userId: 'test-user-123' };
      next();
    });
    
    // Mock rate limiter to always allow
    app.use((req, res, next) => next());
    
    app.use('/api/stripe', stripeRouter);

    // Setup Stripe mock
    mockStripe = new Stripe('sk_test_mock', { apiVersion: '2023-10-16' }) as jest.Mocked<Stripe>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /create-checkout-session', () => {
    it('should create a checkout session with valid price ID', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/stripe/create-checkout-session')
        .send({ priceId: 'price_test_pro' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });
    });

    it('should reject invalid price ID', async () => {
      const response = await request(app)
        .post('/api/stripe/create-checkout-session')
        .send({ priceId: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should handle Stripe API errors', async () => {
      (mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe API error')
      );

      const response = await request(app)
        .post('/api/stripe/create-checkout-session')
        .send({ priceId: 'price_test_pro' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /one-time-checkout', () => {
    it('should create one-time payment session', async () => {
      const mockSession = {
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test-one-time',
      };

      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/stripe/one-time-checkout')
        .send({
          filename: 'test-song.mp3',
          amountCents: 499,
          currency: 'usd',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.url).toBe('https://checkout.stripe.com/test-one-time');
    });

    it('should reject invalid amount', async () => {
      const response = await request(app)
        .post('/api/stripe/one-time-checkout')
        .send({
          filename: 'test-song.mp3',
          amountCents: 50, // Below minimum
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /create-portal-session', () => {
    it('should create portal session for user with subscription', async () => {
      const mockPortalSession = {
        url: 'https://billing.stripe.com/test',
      };

      (mockStripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue(
        mockPortalSession
      );

      (mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
      });

      const response = await request(app)
        .post('/api/stripe/create-portal-session')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.url).toBe('https://billing.stripe.com/test');
    });

    it('should reject user without subscription', async () => {
      const response = await request(app)
        .post('/api/stripe/create-portal-session')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No active subscription');
    });
  });

  describe('POST /webhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'subscription',
            subscription: 'sub_test_123',
            metadata: { userId: 'test-user-123' },
          },
        },
      };

      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });

    it('should reject webhook without signature', async () => {
      const response = await request(app)
        .post('/api/stripe/webhook')
        .send({ type: 'test.event' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing signature');
    });

    it('should handle duplicate webhook events', async () => {
      const mockEvent = {
        id: 'evt_test_duplicate',
        type: 'checkout.session.completed',
      };

      (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // First call
      await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send(mockEvent);

      // Second call (duplicate)
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test-signature')
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on checkout endpoints', async () => {
      // Make 11 requests (limit is 10 per 15 min)
      const requests = Array(11).fill(null).map(() =>
        request(app)
          .post('/api/stripe/create-checkout-session')
          .send({ priceId: 'price_test_pro' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
