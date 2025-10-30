import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stripeRoutes from './routes/stripe';
import subscriptionRoutes from './routes/subscription';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' })); // Raw body for Stripe webhook
app.use(express.json());

// Routes - Only payment and subscription routes (Auth handled by Supabase)
app.use('/api/stripe', stripeRoutes);
app.use('/api/subscription', subscriptionRoutes);

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
