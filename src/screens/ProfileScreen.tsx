import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../state/authStore';
import { apiClient } from '../api/backend';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, logout, simulateProUpgrade } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleDemoUpgrade = () => {
    Alert.alert(
      'Demo Mode',
      'Since the backend is offline, would you like to simulate Pro features for testing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable Pro (Demo)',
          onPress: () => {
            simulateProUpgrade();
            Alert.alert('Success', 'Pro features enabled! This is demo mode only.');
          },
        },
      ]
    );
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
      '📧 Email: support@sonicboost.app\n' +
      '📱 Support Hours: 9 AM - 5 PM EST\n\n' +
      'Common Questions:\n' +
      '• How do I download my enhanced audio?\n' +
      '  → Subscribe to a plan, then download from Results screen\n\n' +
      '• How do I cancel my subscription?\n' +
      '  → Go to "Manage Subscription" above\n\n' +
      '• Audio quality issues?\n' +
      '  → Ensure your source file is high quality (WAV or high-bitrate MP3)',
      [
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@sonicboost.app') },
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
      '• One-click audio mastering\n' +
      '• AI-powered enhancement\n' +
      '• Professional-grade results\n' +
      '• Support for all genres\n\n' +
      '👨\u200d💻 Developer:\n' +
      'Emmanuel Ngobeh\n\n' +
      '📧 Contact: manngobeh2006@gmail.com\n\n' +
      '🔒 Your privacy matters. We never share your audio files.\n\n' +
      '© 2025 SonicBoost. All rights reserved.',
      [
        { text: 'Privacy Policy', onPress: () => Linking.openURL('https://your-privacy-policy-url.com') },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const getSubscriptionBadgeColor = () => {
    const tier = user?.subscriptionTier || user?.subscriptionStatus || 'free';
    switch (tier) {
      case 'pro':
        return 'bg-purple-600';
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
            <Text className="text-white text-xl font-bold">{user?.name}</Text>
            <Text className="text-gray-400 text-sm mt-1">{user?.email}</Text>
          </View>

          {/* Subscription Badge */}
          <View className="flex-row items-center justify-center">
            <View className={`${getSubscriptionBadgeColor()} px-4 py-2 rounded-full flex-row items-center`}>
              <Ionicons name="star" size={16} color="white" />
              <Text className="text-white text-sm font-semibold ml-2 uppercase">
                {user?.subscriptionStatus} Plan
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription Info */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-4">Subscription</Text>
          <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">Stripe ID</Text>
              <Text className="text-white text-sm font-mono">
                {user?.subscriptionId}
              </Text>
            </View>
            <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">Status</Text>
              <View className="bg-green-500/20 px-3 py-1 rounded-full">
                <Text className="text-green-400 text-xs font-semibold">Active</Text>
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

          {/* Demo Mode Button (for testing without backend) */}
          {user?.subscriptionTier !== 'pro' && (
            <Pressable 
              onPress={handleDemoUpgrade}
              className="bg-blue-600/10 rounded-2xl p-4 flex-row items-center justify-between border border-blue-600/30 active:opacity-70"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-600/20 rounded-full items-center justify-center mr-3">
                  <Ionicons name="flask" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base">Test Pro Features (Demo)</Text>
                  <Text className="text-blue-400 text-xs mt-0.5">For testing without backend</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
            </Pressable>
          )}
        </View>

        {/* Settings */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-4">Settings</Text>

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

        {/* Logout Button */}
        <View className="mx-6 mb-8">
          <Pressable
            onPress={handleLogout}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex-row items-center justify-center active:opacity-70"
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text className="text-red-500 text-base font-semibold ml-2">Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
