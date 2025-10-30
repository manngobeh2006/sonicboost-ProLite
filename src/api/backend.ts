import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API configuration
// In Vibecode, use the public backend URL that's exposed through the proxy
const VIBECODE_BACKEND_URL = process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL;

const API_URL = __DEV__
  ? VIBECODE_BACKEND_URL || 'http://172.17.0.2:3000/api'  // Use Vibecode proxy URL or fallback
  : 'https://your-backend.com/api'; // Production

console.log('🔧 Backend URL configured:', API_URL);

// Token storage key
const TOKEN_KEY = 'auth_token';

/**
 * API Client for SonicBoost ProLite backend
 */
class APIClient {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  // Load token from storage
  async loadToken() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  // Save token to storage
  async saveToken(token: string) {
    try {
      this.token = token;
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  // Clear token from storage
  async clearToken() {
    try {
      this.token = null;
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  // Make authenticated request with timeout
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log(`🌐 Making request to: ${API_URL}${endpoint}`);
    console.log(`📤 Request data:`, options.body);

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

      console.log(`📥 Response status: ${response.status}`);
      console.log(`📥 Response content-type: ${response.headers.get('content-type')}`);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Non-JSON response received:', textResponse.substring(0, 200));
        throw new Error('Backend returned non-JSON response. The backend server may be offline or misconfigured.');
      }

      const data = await response.json();
      console.log(`📥 Response data:`, data);

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

  // Authentication endpoints
  async register(email: string, password: string, name: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (data.token) {
      await this.saveToken(data.token);
    }

    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      await this.saveToken(data.token);
    }

    return data;
  }

  async logout() {
    await this.clearToken();
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // Subscription endpoints
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
