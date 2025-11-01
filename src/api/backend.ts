import { supabase } from './supabase';
import { retryAPICall, withTimeout } from '../utils/retry';
import { logInfo, logError } from '../utils/logger';

// Backend API configuration
// In Vibecode, use the public backend URL that's exposed through the proxy
const VIBECODE_BACKEND_URL = process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL;

const API_URL = __DEV__
  ? VIBECODE_BACKEND_URL || 'http://172.17.0.2:3000/api'  // Use Vibecode proxy URL or fallback
  : 'https://sonicboost-backend.onrender.com/api'; // Production

if (__DEV__) {
  console.log('🔧 Backend URL configured:', API_URL);
}

/**
 * API Client for SonicBoost ProLite backend
 * Uses Supabase Auth for authentication
 */
class APIClient {
  // Get current Supabase auth token
  async getToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  // Make authenticated request with timeout and retry logic
  private async request(endpoint: string, options: RequestInit = {}) {
    return await retryAPICall(
      async () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        };

        // Add auth token from Supabase if available
        const token = await this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        logInfo(`API Request: ${endpoint}`, { method: options.method || 'GET' });

        if (__DEV__) {
          console.log(`🌐 Making request to: ${API_URL}${endpoint}`);
          console.log(`📤 Request data:`, options.body);
        }

        // Wrap fetch with timeout
        const response = await withTimeout(
          fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
          }),
          30000,
          'Request timeout - backend may be unreachable'
        );

        if (__DEV__) {
          console.log(`📥 Response status: ${response.status}`);
          console.log(`📥 Response content-type: ${response.headers.get('content-type')}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error('❌ Non-JSON response received:', textResponse.substring(0, 200));
          const error: any = new Error('Backend returned non-JSON response. The backend server may be offline or misconfigured.');
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        
        if (__DEV__) {
          console.log(`📥 Response data:`, data);
        }

        if (!response.ok) {
          const error: any = new Error(data.error || 'Request failed');
          error.status = response.status;
          throw error;
        }

        return data;
      },
      `Backend ${endpoint}`,
      {
        maxRetries: 3,
        baseDelay: 1000,
      }
    );
  }

  // Subscription endpoints (Auth handled by Supabase)
  async createCheckoutSession(priceId: string) {
    return await this.request('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  async createPortalSession() {
    return await this.request('/stripe/create-portal-session', {
      method: 'POST',
    });
  }

  // One-time checkout session
  async createOneTimeCheckout(params: { filename: string; amountCents: number; currency?: string }) {
    return await this.request('/stripe/one-time-checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getSubscriptionStatus() {
    return await this.request('/subscription/status');
  }

  // Usage endpoints
  async checkLimit() {
    return await this.request('/usage/check-limit');
  }

  async incrementUsage(data: {
    genre: string;
    tempo: number;
    duration: number;
    filename: string;
  }) {
    return await this.request('/usage/increment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHistory() {
    return await this.request('/usage/history');
  }

  // Authorize download: returns allowed if subscription active or order paid
  async authorizeDownload(params: { orderId?: string; filename?: string }) {
    return await this.request('/usage/authorize-download', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export types
export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  subscriptionId?: string;
  enhancementsThisMonth: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface SubscriptionStatus {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  tier: string;
  enhancementsThisMonth: number;
}

export interface UsageLimit {
  success: boolean;
  canMaster: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}
