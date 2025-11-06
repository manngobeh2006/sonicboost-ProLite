import express, { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import Stripe from 'stripe';

const router = express.Router();

// Basic health check
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    env: process.env.NODE_ENV || 'development',
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = 'ERROR';
    res.status(503).json(healthCheck);
  }
});

// Detailed health check with dependencies
router.get('/health/detailed', async (req: Request, res: Response): Promise<void> => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown', latency: 0 },
      stripe: { status: 'unknown' },
      environment: { status: 'unknown', missing: [] as string[] },
    },
  };

  // Check database connection
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();
    
    const latency = Date.now() - start;
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for health check
      checks.checks.database = { status: 'unhealthy', latency };
      checks.status = 'unhealthy';
    } else {
      checks.checks.database = { status: 'healthy', latency };
    }
  } catch (error) {
    checks.checks.database = { status: 'unhealthy', latency: 0 };
    checks.status = 'unhealthy';
  }

  // Check Stripe connection
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    
    // Verify API key works (lightweight call)
    await stripe.balance.retrieve();
    checks.checks.stripe = { status: 'healthy' };
  } catch (error: any) {
    checks.checks.stripe = { status: 'unhealthy', error: error.message };
    checks.status = 'degraded';
  }

  // Check required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'JWT_SECRET',
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    checks.checks.environment = { status: 'unhealthy', missing };
    checks.status = 'unhealthy';
  } else {
    checks.checks.environment = { status: 'healthy', missing: [] };
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

// Ready check (for Kubernetes/Docker)
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    // Quick database check
    await supabase.from('users').select('count').limit(1);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// Liveness check (for Kubernetes/Docker)
router.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({ status: 'alive' });
});

// Metrics endpoint (basic)
router.get('/metrics', (req: Request, res: Response): void => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    node_version: process.version,
  };

  res.status(200).json(metrics);
});

export default router;
