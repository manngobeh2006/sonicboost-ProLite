import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/backend';

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  subscriptionId?: string;
  mastersThisMonth?: number;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  simulateProUpgrade: () => void; // For testing without backend
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await apiClient.login(email, password);
          
          if (response.success && response.user) {
            set({ user: response.user, isAuthenticated: true });
            return { success: true };
          }
          
          return { success: false, error: "Login failed" };
        } catch (error: any) {
          return { success: false, error: error.message || "Invalid email or password" };
        }
      },

      signup: async (email: string, password: string, name: string) => {
        try {
          if (password.length < 6) {
            return { success: false, error: "Password must be at least 6 characters" };
          }

          const response = await apiClient.register(email, password, name);
          
          if (response.success && response.user) {
            set({ user: response.user, isAuthenticated: true });
            return { success: true };
          }
          
          return { success: false, error: "Signup failed" };
        } catch (error: any) {
          return { success: false, error: error.message || "Email already exists" };
        }
      },

      logout: async () => {
        await apiClient.logout();
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
        }
      },

      refreshUser: async () => {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.user) {
            set({ user: response.user, isAuthenticated: true });
          }
        } catch (error) {
          console.error('Failed to refresh user:', error);
          // If token is invalid, logout
          set({ user: null, isAuthenticated: false });
        }
      },

      // Simulate Pro upgrade for testing without backend
      simulateProUpgrade: () => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { 
            ...currentUser, 
            subscriptionStatus: 'pro',
            subscriptionTier: 'pro',
            subscriptionId: 'demo_subscription',
          };
          set({ user: updatedUser });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
