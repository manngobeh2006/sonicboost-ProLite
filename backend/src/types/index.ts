export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  subscription_status: string;
  subscription_tier: string;
  subscription_id?: string;
  enhancements_this_month: number;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  subscriptionId?: string;
  enhancementsThisMonth: number;
  createdAt: string;
}

export interface AuthRequest {
  userId: string;
  email: string;
}

export interface MasteringHistory {
  id: string;
  user_id: string;
  genre: string;
  tempo: number;
  duration: number;
  filename: string;
  created_at: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthRequest;
    }
  }
}
