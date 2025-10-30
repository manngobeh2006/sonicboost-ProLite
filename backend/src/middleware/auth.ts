import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';

export interface AuthPayload {
  userId: string;
  email: string;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(403).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email || ''
    };
    
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
    return;
  }
};
