import express, { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Check if user can master (based on usage limits)
router.get('/check-limit', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier, enhancements_this_month')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const limits = {
      free: 3,
      pro: 20,
      unlimited: Infinity,
    };

    const limit = limits[user.subscription_tier as keyof typeof limits] || 3;
    const used = user.enhancements_this_month || 0;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
    const canMaster = remaining > 0;

    res.json({
      success: true,
      canMaster,
      used,
      limit: limit === Infinity ? -1 : limit,
      remaining: remaining === Infinity ? -1 : remaining,
      tier: user.subscription_tier,
    });
  } catch (error: any) {
    console.error('Check limit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Increment usage after mastering
router.post('/increment', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { genre, tempo, duration, filename } = req.body;

    // Increment masters count
    const { error: updateError } = await supabase.rpc('increment_enhancements', {
      user_id: req.user!.userId,
    });

    if (updateError) {
      throw updateError;
    }

    // Save to history
    const { error: historyError } = await supabase
      .from('audio_enhancement_history')
      .insert({
        user_id: req.user!.userId,
        genre,
        tempo,
        duration,
        filename,
      });

    if (historyError) {
      console.error('History save error:', historyError);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Increment usage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get mastering history
router.get('/history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: history, error } = await supabase
      .from('audio_enhancement_history')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      history: history || [],
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authorize one-time download for a specific order or by filename
router.post('/authorize-download', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, filename } = req.body as { orderId?: string; filename?: string };

    // If user is subscribed and active, allow
    const { data: user } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier')
      .eq('id', req.user!.userId)
      .single();

    if (user && (user.subscription_status === 'active' || user.subscription_tier === 'pro' || user.subscription_tier === 'unlimited')) {
      res.json({ success: true, allowed: true, reason: 'subscription' });
      return;
    }

    // Else, check paid one-time order
    let allowed = false;
    if (orderId) {
      const { data: order } = await supabase
        .from('one_time_orders')
        .select('status, user_id')
        .eq('id', orderId)
        .single();
      allowed = !!order && order.user_id === req.user!.userId && order.status === 'paid';
    } else if (filename) {
      const { data: orders } = await supabase
        .from('one_time_orders')
        .select('status')
        .eq('user_id', req.user!.userId)
        .eq('filename', filename)
        .order('created_at', { ascending: false })
        .limit(1);
      allowed = !!orders && orders.length > 0 && orders[0].status === 'paid';
    }

    res.json({ success: true, allowed, reason: allowed ? 'one-time' : 'none' });
  } catch (error: any) {
    console.error('Authorize download error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
