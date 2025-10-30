import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabase';
import { authenticateToken } from '../middleware/auth';
import { User, UserResponse } from '../types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to format user response
const formatUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  subscriptionStatus: user.subscription_status,
  subscriptionTier: user.subscription_tier,
  subscriptionId: user.subscription_id,
  enhancementsThisMonth: user.enhancements_this_month,
  createdAt: user.created_at,
});

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name,
        password_hash: passwordHash,
        subscription_status: 'free',
        subscription_tier: 'free',
        enhancements_this_month: 0,
      })
      .select()
      .single();

    if (error || !newUser) {
      throw error || new Error('Failed to create user');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: formatUserResponse(newUser as User),
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Missing email or password' });
      return;
    }

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: formatUserResponse(user as User),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Login failed' });
  }
});

// Forgot password - send reset email
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      res.json({ 
        success: true, 
        message: 'If an account with this email exists, you will receive a password reset link.' 
      });
      return;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real app, you would send this via email
    // For now, we'll just return the token (remove this in production)
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link.',
      // Remove this in production - only for development
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ success: false, error: 'Token and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'password_reset') {
      res.status(400).json({ success: false, error: 'Invalid reset token' });
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', decoded.userId);

    if (updateError) {
      console.error('Password update error:', updateError);
      res.status(500).json({ success: false, error: 'Failed to update password' });
      return;
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to reset password' });
    }
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: formatUserResponse(user as User),
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get user' });
  }
});

export default router;
