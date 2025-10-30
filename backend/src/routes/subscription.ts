import express, { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get subscription status
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier, subscription_id, enhancements_this_month')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      subscription: user.subscription_id ? {
        id: user.subscription_id,
        status: user.subscription_status,
      } : null,
      tier: user.subscription_tier,
      enhancementsThisMonth: user.enhancements_this_month || 0,
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
