import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API configuration
const API_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development (use your computer's IP for real device: http://192.168.1.100:3000/api)
  : 'https://your-backend.com/api'; // Production

// Token storage key
const TOKEN_KEY = 'auth_token';

/**
 * API Client for Clickmaster ProLite backend
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

  // Make authenticated request
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
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
  mastersThisMonth?: number;
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
  mastersThisMonth: number;
}

export interface UsageLimit {
  success: boolean;
  canMaster: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}
