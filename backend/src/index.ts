import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stripeRoutes from './routes/stripe';
import subscriptionRoutes from './routes/subscription';
import usageRoutes from './routes/usage';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'STRIPE_SECRET_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Warn if webhook secret is missing (can be added after deployment)
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set - webhooks will not work until configured');
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [];
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : '*',
  credentials: true
}));

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' })); // Raw body for Stripe webhook
app.use(express.json());

// Routes - Only payment and subscription routes (Auth handled by Supabase)
app.use('/api/stripe', stripeRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/usage', usageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SonicBoost Payment API is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Payment API running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth handled by Supabase`);
});
