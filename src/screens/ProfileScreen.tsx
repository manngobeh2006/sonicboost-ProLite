import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../state/authStore';
import { apiClient } from '../api/backend';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { getFFmpegInfo } from '../utils/ffmpegDiagnostics';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, logout, refreshUser, updateProfileWithBackend } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Auto-refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Profile screen focused - refreshing user data...');
      refreshUser();
    }, [refreshUser])
  );

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditName('');
    setEditEmail('');
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() && !editEmail.trim()) {
      Alert.alert('Error', 'Please enter at least one field');
      return;
    }

    setIsSaving(true);
    try {
      const updates: { name?: string; email?: string } = {};
      
      // Only include fields that changed
      if (editName.trim() && editName !== user?.name) {
        updates.name = editName.trim();
      }
      if (editEmail.trim() && editEmail !== user?.email) {
        updates.email = editEmail.trim();
      }

      if (Object.keys(updates).length === 0) {
        Alert.alert('No Changes', 'No changes were made to your profile');
        setIsEditingProfile(false);
        return;
      }

      const result = await updateProfileWithBackend(updates);
      
      if (result.success) {
        Alert.alert('Success', result.message || 'Profile updated successfully');
        setIsEditingProfile(false);
        // Refresh to get latest data
        await refreshUser();
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    // Check if user has an active subscription
    const tier = user?.subscriptionTier || user?.subscriptionStatus || 'free';
    if (tier === 'free' || !user?.subscriptionId) {
      Alert.alert(
        'No Active Subscription',
        'You don\'t have an active subscription yet. Subscribe to a plan first to manage your subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => navigation.navigate('Subscriptions') },
        ]
      );
      return;
    }

    // Show user instructions before opening portal
    Alert.alert(
      'Opening Subscription Management',
      'You\'ll be redirected to a secure page to manage your subscription.\n\nWhen finished, simply close the browser tab and return to the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: async () => {
            setLoading(true);
            try {
              const response = await apiClient.createPortalSession();
              
              if (response.success && response.url) {
                await Linking.openURL(response.url);
              } else {
                Alert.alert('Error', 'Could not open subscription management');
              }
            } catch (error: any) {
              console.error('Portal error:', error);

              // Check if it's a backend error (not running or misconfigured)
              if (error.message?.includes('Network request failed') ||
                  error.message?.includes('fetch') ||
                  error.message?.includes('Backend returned non-JSON') ||
                  error.message?.includes('backend server may be offline') ||
                  error.message?.includes('Cannot connect to backend')) {
                Alert.alert(
                  'Backend Offline',
                  'The backend server is not running. Subscription management requires a live backend connection.\n\n' +
                  'For testing: The app works without the backend, but subscription features need the server running.\n\n' +
                  'To start the backend:\n' +
                  '1. Configure backend/.env with your database and Stripe keys\n' +
                  '2. Run: cd backend && npm install && npm start',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', error.message || 'Failed to open subscription portal');
              }
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.\n\nTo confirm, please enter your password:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Show password input dialog
            Alert.prompt(
              'Enter Password',
              'Enter your password to confirm account deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password || !password.trim()) {
                      Alert.alert('Error', 'Password is required');
                      return;
                    }

                    setIsDeletingAccount(true);
                    try {
                      const result = await apiClient.deleteAccount(password.trim());
                      
                      if (result.success) {
                        Alert.alert(
                          'Account Deleted',
                          result.message || 'Your account has been permanently deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                // Logout user
                                await logout();
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert('Error', result.error || 'Failed to delete account');
                      }
                    } catch (error: any) {
                      console.error('Delete account error:', error);
                      Alert.alert(
                        'Error',
                        error.message || 'Failed to delete account. Please try again.'
                      );
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Need assistance?\n\n' +
      '📧 Email: manngobeh2006@gmail.com\n' +
      '📱 Support Hours: 9 AM - 5 PM EST\n\n' +
      'Common Questions:\n' +
      '• How do I download my enhanced audio?\n' +
      '  → Subscribe to a plan, then download from Results screen\n\n' +
      '• How do I cancel my subscription?\n' +
      '  → Go to "Manage Subscription" above\n\n' +
      '• Audio quality issues?\n' +
      '  → Ensure your source file is high quality (WAV or high-bitrate MP3)',
      [
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:manngobeh2006@gmail.com') },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About SonicBoost ProLite',
      'Version 1.0.0\n\n' +
      'AI-powered audio enhancement for musicians, podcasters, and content creators.\n\n' +
      '🎵 Features:\n' +
      '• One-click sonic enhancement\n' +
      '• AI-powered audio processing\n' +
      '• Professional-grade results\n' +
      '• Support for all genres\n\n' +
      '👨‍💻 Developer:\n' +
      'Emmanuel Ngobeh\n\n' +
      '📧 Contact: manngobeh2006@gmail.com\n\n' +
      '🔒 Your privacy matters. We never share your audio files.\n\n' +
      '© 2025 SonicBoost. All rights reserved.',
      [
        { text: 'Privacy Policy', onPress: () => Linking.openURL('https://lemon-metacarpal-c60.notion.site/Privacy-Policy-29d3cfc7ef1480f6aeb9f51ee181b202') },
        { text: 'Terms of Service', onPress: () => Linking.openURL('https://lemon-metacarpal-c60.notion.site/Terms-of-Service-29d3cfc7ef1480efa08ecd61b13a9d01') },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleDiagnostics = async () => {
    setLoading(true);
    try {
      const info = await getFFmpegInfo();
      Alert.alert('System Diagnostics', info, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', 'Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadgeColor = () => {
    const tier = user?.subscriptionTier || user?.subscriptionStatus || 'free';
    switch (tier) {
      case 'pro':
        return 'bg-purple-600';
      case 'unlimited':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1">
        {/* Header with Back Button */}
        <View className="px-6 py-6 flex-row items-center">
          <Pressable 
            onPress={() => navigation.goBack()} 
            className="mr-4 w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-3xl font-bold">Profile</Text>
        </View>

        {/* User Info Card */}
        <View className="mx-6 mb-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <View className="items-center mb-6">
            <View className="w-24 h-24 bg-purple-600 rounded-full items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            {!isEditingProfile ? (
              <>
                <Text className="text-white text-xl font-bold">{user?.name}</Text>
                <Text className="text-gray-400 text-sm mt-1">{user?.email}</Text>
              </>
            ) : (
              <View className="w-full mt-2">
                <Text className="text-gray-400 text-xs mb-2">Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#6B7280"
                  className="bg-gray-800 text-white px-4 py-3 rounded-xl mb-4 border border-gray-700"
                />
                <Text className="text-gray-400 text-xs mb-2">Email</Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700"
                />
                <View className="flex-row mt-4 space-x-3">
                  <Pressable
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 bg-gray-800 py-3 rounded-xl active:opacity-70"
                  >
                    <Text className="text-gray-300 text-center font-semibold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 bg-purple-600 py-3 rounded-xl active:opacity-70"
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white text-center font-semibold">Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Subscription Badge & Edit Button */}
          <View className="flex-row items-center justify-center">
            {!isEditingProfile && (
              <Pressable
                onPress={handleEditProfile}
                className="absolute left-0 bg-gray-800 px-3 py-2 rounded-full active:opacity-70"
              >
                <Ionicons name="pencil" size={16} color="#9CA3AF" />
              </Pressable>
            )}
            <View className={`${getSubscriptionBadgeColor()} px-4 py-2 rounded-full flex-row items-center`}>
              <Ionicons name="star" size={16} color="white" />
              <Text className="text-white text-sm font-semibold ml-2 uppercase">
                {user?.subscriptionTier || 'Free'} Plan
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription Info */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-4">Account Details</Text>
          <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">Plan</Text>
              <Text className="text-white text-sm font-semibold">
                {user?.subscriptionTier === 'pro' ? 'Pro Plan' : user?.subscriptionTier === 'unlimited' ? 'Unlimited Plan' : 'Free Plan'}
              </Text>
            </View>
            <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">Status</Text>
              <View className={`px-3 py-1 rounded-full ${user?.subscriptionStatus === 'active' ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                <Text className={`text-xs font-semibold ${user?.subscriptionStatus === 'active' ? 'text-green-400' : 'text-gray-400'}`}>
                  {user?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center p-4">
              <Text className="text-gray-400 text-sm">Member Since</Text>
              <Text className="text-white text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-4">Subscription</Text>
          
          <Pressable 
            onPress={() => navigation.navigate('Subscriptions')}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between mb-3 border border-gray-800 active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-purple-600/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="diamond" size={20} color="#9333EA" />
              </View>
              <Text className="text-white text-base">View Plans & Upgrade</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </Pressable>

          <Pressable 
            onPress={handleManageSubscription}
            disabled={loading}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between mb-3 border border-gray-800 active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-purple-600/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="card" size={20} color="#9333EA" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base">Manage Subscription</Text>
                <Text className="text-gray-500 text-xs mt-0.5">Cancel, update payment method</Text>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#9333EA" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            )}
          </Pressable>
        </View>

        {/* Settings */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-4">Settings</Text>

          <Pressable 
            onPress={handleDiagnostics}
            disabled={loading}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between mb-3 border border-gray-800 active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-600/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="bug" size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base">Run Diagnostics</Text>
                <Text className="text-gray-500 text-xs mt-0.5">Test FFmpeg audio processing</Text>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            )}
          </Pressable>

          <Pressable 
            onPress={handleHelpSupport}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between mb-3 border border-gray-800 active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-600/20 rounded-full items-center justify-center mr-3">
                <Ionicons name="help-circle" size={20} color="#3B82F6" />
              </View>
              <Text className="text-white text-base">Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </Pressable>

          <Pressable 
            onPress={handleAbout}
            className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between border border-gray-800 active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-gray-700/50 rounded-full items-center justify-center mr-3">
                <Ionicons name="information-circle" size={20} color="#9CA3AF" />
              </View>
              <Text className="text-white text-base">About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View className="mx-6 mb-8">
          <Text className="text-white text-lg font-semibold mb-4">Danger Zone</Text>
          
          {/* Delete Account Button */}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex-row items-center justify-center mb-3 active:opacity-70"
          >
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text className="text-red-500 text-base font-semibold ml-2">Delete Account</Text>
              </>
            )}
          </Pressable>
          
          {/* Logout Button */}
          <Pressable
            onPress={handleLogout}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-row items-center justify-center active:opacity-70"
          >
            <Ionicons name="log-out" size={20} color="#9CA3AF" />
            <Text className="text-gray-400 text-base font-semibold ml-2">Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
