import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';
import { apiClient } from '../api/backend';
import { useAudioStore } from './audioStore';

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

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; shouldRedirectToLogin?: boolean }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  updateProfileWithBackend: (updates: { name?: string; email?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  refreshUser: () => Promise<void>;
  simulateProUpgrade: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          console.log('🚀 Starting login...');

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error('❌ Login error:', error);
            
            // Provide more user-friendly error messages
            if (error.message.includes('Invalid login credentials')) {
              return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
            } else if (error.message.includes('Email not confirmed')) {
              return { success: false, error: 'Please check your email and click the confirmation link before logging in.' };
            } else if (error.message.includes('Too many requests')) {
              return { success: false, error: 'Too many login attempts. Please wait a moment before trying again.' };
            } else if (error.message.includes('User not found')) {
              return { success: false, error: 'No account found with this email address. Please sign up first.' };
            }
            
            return { success: false, error: error.message };
          }

          if (data.user) {
            // Fetch user profile from users table
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) {
              console.error('❌ Profile fetch error:', profileError);

              // If profile doesn't exist, create it
              if (profileError.code === 'PGRST116') {
                console.log('📝 Creating missing profile...');
                const { data: newProfile, error: createError } = await supabase
                  .from('users')
                  .upsert({
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.email?.split('@')[0] || 'User',
                    subscription_status: 'free',
                    subscription_tier: 'free',
                    enhancements_this_month: 0,
                  }, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                  })
                  .select()
                  .single();

                if (createError) {
                  console.error('❌ Profile creation error:', createError);
                  console.error('Error code:', createError.code);
                  console.error('Error details:', createError.details);
                  console.error('Error hint:', createError.hint);
                  return { success: false, error: `Failed to create user profile: ${createError.message}` };
                }

                const user: User = {
                  id: newProfile.id,
                  email: newProfile.email,
                  name: newProfile.name,
                  subscriptionStatus: newProfile.subscription_status,
                  subscriptionTier: newProfile.subscription_tier,
                  subscriptionId: newProfile.subscription_id,
                  enhancementsThisMonth: newProfile.enhancements_this_month,
                  createdAt: newProfile.created_at,
                };

                console.log('✅ Login successful with new profile');
                set({ user, isAuthenticated: true });
                return { success: true };
              }

              return { success: false, error: 'Failed to fetch user profile' };
            }

            const user: User = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              subscriptionStatus: profile.subscription_status,
              subscriptionTier: profile.subscription_tier,
              subscriptionId: profile.subscription_id,
              enhancementsThisMonth: profile.enhancements_this_month,
              createdAt: profile.created_at,
            };

            console.log('✅ Login successful');
            set({ user, isAuthenticated: true });
            return { success: true };
          }

          return { success: false, error: 'Login failed' };
        } catch (error: any) {
          console.error('❌ Login error:', error);
          return { success: false, error: error.message || 'Invalid email or password' };
        }
      },

      signup: async (email: string, password: string, name: string) => {
        try {
          console.log('🚀 Starting signup process...');

          if (password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
          }

          // Check if user already exists in the database
          const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

          if (existingUser) {
            console.log('❌ Email already exists');
            return { 
              success: false, 
              error: 'An account with this email already exists. Please login instead.',
              shouldRedirectToLogin: true
            };
          }

          // Sign up with Supabase Auth
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name,
              },
            },
          });

          if (error) {
            console.error('❌ Signup error:', error);
            
            // Check if it's a user already exists error
            if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
              return { 
                success: false, 
                error: 'An account with this email already exists. Please login instead.',
                shouldRedirectToLogin: true
              };
            } else if (error.message.includes('Password should be at least')) {
              return { success: false, error: 'Password must be at least 6 characters long.' };
            } else if (error.message.includes('Invalid email')) {
              return { success: false, error: 'Please enter a valid email address.' };
            } else if (error.message.includes('Signup is disabled')) {
              return { success: false, error: 'Account creation is currently disabled. Please contact support.' };
            }
            
            return { success: false, error: error.message };
          }

          if (data.user) {
            // Wait a moment for the database trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fetch the user profile created by the trigger
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) {
              console.error('❌ Profile fetch error after signup:', profileError);
              
              // If profile doesn't exist yet, create minimal user object from auth data
              console.log('⏳ Profile will be created by database trigger, creating minimal user...');
              const minimalUser: User = {
                id: data.user.id,
                email: data.user.email!,
                name: name,
                subscriptionStatus: 'free',
                subscriptionTier: 'free',
                subscriptionId: undefined,
                enhancementsThisMonth: 0,
                createdAt: new Date().toISOString(),
              };
              
              console.log('✅ Signup successful with minimal profile');
              set({ user: minimalUser, isAuthenticated: true });
              return { success: true };
            }

            const user: User = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              subscriptionStatus: profile.subscription_status,
              subscriptionTier: profile.subscription_tier,
              subscriptionId: profile.subscription_id,
              enhancementsThisMonth: profile.enhancements_this_month,
              createdAt: profile.created_at,
            };

            console.log('✅ Signup successful');
            set({ user, isAuthenticated: true });
            return { success: true };
          }

          return { success: false, error: 'Signup failed' };
        } catch (error: any) {
          console.error('❌ Signup error:', error);
          return { success: false, error: error.message || 'Email already exists' };
        }
      },

      forgotPassword: async (email: string) => {
        try {
          console.log('🚀 Starting forgot password process...');

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://sonicboost-app.one-clickmaster.com/reset-password',
          });

          if (error) {
            console.error('❌ Forgot password error:', error);

            // Provide more user-friendly error messages
            if (error.message.includes('Invalid email')) {
              return { success: false, error: 'Please enter a valid email address.' };
            } else if (error.message.includes('rate limit')) {
              return { success: false, error: 'Too many requests. Please wait a moment before trying again.' };
            }

            return { success: false, error: error.message };
          }

          console.log('✅ Forgot password request successful');
          return {
            success: true,
            message: 'If an account with this email exists, you will receive a password reset link.',
          };
        } catch (error: any) {
          console.error('❌ Forgot password error:', error);
          return { success: false, error: error.message || 'Failed to send reset email' };
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        try {
          console.log('🚀 Starting password reset process...');

          if (newPassword.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
          }

          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (error) {
            console.error('❌ Reset password error:', error);

            // Provide more user-friendly error messages
            if (error.message.includes('Password should be at least')) {
              return { success: false, error: 'Password must be at least 6 characters long.' };
            } else if (error.message.includes('rate limit')) {
              return { success: false, error: 'Too many requests. Please wait a moment before trying again.' };
            }

            return { success: false, error: error.message };
          }

          console.log('✅ Password reset successful');
          return {
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.',
          };
        } catch (error: any) {
          console.error('❌ Reset password error:', error);
          return { success: false, error: error.message || 'Failed to reset password' };
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
        // Reset session flag so button doesn't show after re-login
        useAudioStore.getState().setHasProcessedInSession(false);
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
        }
      },

      updateProfileWithBackend: async (updates: { name?: string; email?: string }) => {
        try {
          console.log('🚀 Updating profile with backend...');

          if (!updates.name && !updates.email) {
            return { success: false, error: 'At least one field (name or email) is required' };
          }

          // Validate email format if provided
          if (updates.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updates.email)) {
              return { success: false, error: 'Please enter a valid email address' };
            }
          }

          // Call backend API to update profile
          const response = await apiClient.updateProfile(updates);

          if (response.success && response.user) {
            // Update local state with new user data
            const updatedUser: User = {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              subscriptionStatus: response.user.subscriptionStatus,
              subscriptionTier: response.user.subscriptionTier,
              subscriptionId: response.user.subscriptionId,
              enhancementsThisMonth: response.user.enhancementsThisMonth,
              createdAt: response.user.createdAt,
            };
            set({ user: updatedUser });

            // Also update Supabase Auth user metadata if email changed
            if (updates.email) {
              try {
                await supabase.auth.updateUser({ email: updates.email });
              } catch (supabaseError) {
                console.warn('Supabase Auth email update warning:', supabaseError);
                // Don't fail - backend already updated
              }
            }

            console.log('✅ Profile updated successfully');
            return { success: true, message: response.message || 'Profile updated successfully' };
          }

          return { success: false, error: response.error || 'Failed to update profile' };
        } catch (error: any) {
          console.error('❌ Update profile error:', error);
          
          // Check if it's a backend connectivity error
          if (error.message?.includes('Network request failed') ||
              error.message?.includes('backend server may be offline') ||
              error.message?.includes('timeout')) {
            return { 
              success: false, 
              error: 'Cannot connect to server. Profile updates require backend connection.' 
            };
          }
          
          return { success: false, error: error.message || 'Failed to update profile' };
        }
      },

      refreshUser: async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (!authUser) {
            set({ user: null, isAuthenticated: false });
            return;
          }

          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (error || !profile) {
            // If profile doesn't exist by ID, check if one exists by email
            if (error?.code === 'PGRST116') {
              console.log('📝 Profile not found by ID, checking by email...');
              
              // Try to find profile by email
              const { data: emailProfile } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .single();
              
              if (emailProfile) {
                // Profile exists with email but wrong ID - update the ID
                console.log('📝 Updating profile ID to match auth user...');
                const { data: updatedProfile, error: updateError } = await supabase
                  .from('users')
                  .update({ id: authUser.id })
                  .eq('email', authUser.email)
                  .select()
                  .single();
                
                if (updateError || !updatedProfile) {
                  console.error('❌ Failed to update profile ID:', updateError);
                  // If update fails, just use the existing profile
                  const user: User = {
                    id: emailProfile.id,
                    email: emailProfile.email,
                    name: emailProfile.name,
                    subscriptionStatus: emailProfile.subscription_status,
                    subscriptionTier: emailProfile.subscription_tier,
                    subscriptionId: emailProfile.subscription_id,
                    enhancementsThisMonth: emailProfile.enhancements_this_month,
                    createdAt: emailProfile.created_at,
                  };
                  set({ user, isAuthenticated: true });
                  return;
                }
                
                const user: User = {
                  id: updatedProfile.id,
                  email: updatedProfile.email,
                  name: updatedProfile.name,
                  subscriptionStatus: updatedProfile.subscription_status,
                  subscriptionTier: updatedProfile.subscription_tier,
                  subscriptionId: updatedProfile.subscription_id,
                  enhancementsThisMonth: updatedProfile.enhancements_this_month,
                  createdAt: updatedProfile.created_at,
                };
                set({ user, isAuthenticated: true });
                return;
              }
              
              // No profile exists at all - create new one
              console.log('📝 Creating new profile...');
              const { data: newProfile, error: createError } = await supabase
                .from('users')
                .insert({
                  id: authUser.id,
                  email: authUser.email,
                  name: authUser.email?.split('@')[0] || 'User',
                  subscription_status: 'free',
                  subscription_tier: 'free',
                  enhancements_this_month: 0,
                })
                .select()
                .single();

              if (createError || !newProfile) {
                console.error('❌ Failed to create profile during refresh:', createError);
                set({ user: null, isAuthenticated: false });
                return;
              }

              const user: User = {
                id: newProfile.id,
                email: newProfile.email,
                name: newProfile.name,
                subscriptionStatus: newProfile.subscription_status,
                subscriptionTier: newProfile.subscription_tier,
                subscriptionId: newProfile.subscription_id,
                enhancementsThisMonth: newProfile.enhancements_this_month,
                createdAt: newProfile.created_at,
              };

              set({ user, isAuthenticated: true });
              return;
            }

            console.error('Failed to refresh user:', error);
            set({ user: null, isAuthenticated: false });
            return;
          }

          const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            subscriptionStatus: profile.subscription_status,
            subscriptionTier: profile.subscription_tier,
            subscriptionId: profile.subscription_id,
            enhancementsThisMonth: profile.enhancements_this_month,
            createdAt: profile.created_at,
          };

          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to refresh user:', error);
          set({ user: null, isAuthenticated: false });
        }
      },

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

      initialize: () => {
        // Set up Supabase auth state listener
        supabase.auth.onAuthStateChange((event, session) => {
          console.log('🔐 Auth state changed:', event);

          if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false });
          } else if (event === 'SIGNED_IN' && session?.user) {
            // Refresh user profile when signed in
            get().refreshUser();
          }
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
