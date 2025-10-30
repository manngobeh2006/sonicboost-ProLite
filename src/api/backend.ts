import { supabase } from './supabase';

// Backend API configuration
// In Vibecode, use the public backend URL that's exposed through the proxy
const VIBECODE_BACKEND_URL = process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL;

const API_URL = __DEV__
  ? VIBECODE_BACKEND_URL || 'http://172.17.0.2:3000/api'  // Use Vibecode proxy URL or fallback
  : 'https://your-backend.com/api'; // Production

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

  // Make authenticated request with timeout
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token from Supabase if available
    const token = await this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(`🌐 Making request to: ${API_URL}${endpoint}`);
      console.log(`📤 Request data:`, options.body);
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - backend may be unreachable')), 30000);
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        }),
        timeoutPromise
      ]) as Response;

      if (__DEV__) {
        console.log(`📥 Response status: ${response.status}`);
        console.log(`📥 Response content-type: ${response.headers.get('content-type')}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Non-JSON response received:', textResponse.substring(0, 200));
        throw new Error('Backend returned non-JSON response. The backend server may be offline or misconfigured.');
      }

      const data = await response.json();
      
      if (__DEV__) {
        console.log(`📥 Response data:`, data);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
      console.error(`❌ Request failed:`, error);

      // Provide more helpful error messages
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        throw new Error('Cannot connect to backend server. Please ensure the backend is running.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Backend request timed out. The server may be unreachable.');
      } else if (error.message?.includes('non-JSON response')) {
        throw error; // Already has a good message
      }

      throw error;
    }
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
