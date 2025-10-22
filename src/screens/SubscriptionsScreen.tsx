import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { apiClient } from '../api/backend';
import { RootStackParamList } from '../navigation/types';

type SubscriptionsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Subscriptions'>;

// IMPORTANT: Replace with your actual Stripe Price ID from your backend .env
const STRIPE_PRICE_ID_PRO = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_pro_placeholder';

const PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '$0',
    period: '/3 days',
    priceId: null,
    features: [
      '1 master only',
      'Premium quality',
      'MP3 export only',
      'No download history',
      'No tempo analysis',
      'No reference song upload',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    priceId: STRIPE_PRICE_ID_PRO,
    popular: true,
    features: [
      'Unlimited masters',
      'Premium quality',
      'MP3 + WAV export',
      'Download history access',
      'Tempo analysis',
      'Reference song upload',
      'Advanced genre detection',
      'Priority support',
    ],
  },
];

export default function SubscriptionsScreen() {
  const navigation = useNavigation<SubscriptionsScreenNavigationProp>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      // Free plan - already on it
      Alert.alert('Free Plan', 'You are already on the free plan');
      return;
    }

    setLoading(planName);

    try {
      const response = await apiClient.createCheckoutSession(priceId);

      if (response.success && response.url) {
        // Open Stripe Checkout in browser
        await Linking.openURL(response.url);
      } else {
        Alert.alert('Error', 'Could not start checkout process');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert('Error', error.message || 'Failed to start subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getCurrentPlan = () => {
    const tier = user?.subscriptionTier || user?.subscriptionStatus || 'free';
    return tier;
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
          <View className="flex-1">
            <Text className="text-white text-3xl font-bold">Choose Your Plan</Text>
            <Text className="text-gray-400 text-sm mt-1">
              Upgrade to unlock more features
            </Text>
          </View>
        </View>

        {/* Current Plan Info */}
        {user && (
          <View className="mx-6 mb-6 bg-purple-600/10 border border-purple-600/30 rounded-2xl p-4">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={20} color="#9333EA" />
              <Text className="text-purple-400 text-sm font-semibold ml-2">
                Current Plan: {getCurrentPlan().toUpperCase()}
              </Text>
            </View>
            {user.mastersThisMonth !== undefined && (
              <Text className="text-gray-400 text-xs mt-2">
                {user.mastersThisMonth} masters used this month
              </Text>
            )}
          </View>
        )}

        {/* Plans */}
        <View className="px-6 pb-8">
          {PLANS.map((plan) => {
            const isCurrentPlan = getCurrentPlan() === plan.id;

            return (
              <View
                key={plan.id}
                className={`mb-4 rounded-3xl p-6 border-2 ${
                  plan.popular
                    ? 'bg-purple-600/10 border-purple-600'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                {plan.popular && (
                  <View className="absolute -top-3 right-6 bg-purple-600 px-4 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">POPULAR</Text>
                  </View>
                )}

                {isCurrentPlan && (
                  <View className="absolute -top-3 left-6 bg-green-500 px-4 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">CURRENT</Text>
                  </View>
                )}

                <Text className="text-white text-2xl font-bold mb-2">
                  {plan.name}
                </Text>
                <View className="flex-row items-baseline mb-6">
                  <Text className="text-white text-4xl font-bold">{plan.price}</Text>
                  <Text className="text-gray-400 text-base ml-2">{plan.period}</Text>
                </View>

                {/* Features */}
                <View className="mb-6">
                  {plan.features.map((feature, index) => (
                    <View key={index} className="flex-row items-center mb-3">
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text className="text-gray-300 text-sm ml-3">{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Subscribe Button */}
                <Pressable
                  onPress={() => handleSubscribe(plan.priceId, plan.name)}
                  disabled={loading === plan.name || isCurrentPlan}
                  className={`py-4 rounded-2xl items-center ${
                    isCurrentPlan
                      ? 'bg-gray-700'
                      : plan.popular
                      ? 'bg-purple-600 active:opacity-80'
                      : 'bg-gray-800 active:opacity-80'
                  }`}
                >
                  {loading === plan.name ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white text-base font-semibold">
                      {isCurrentPlan ? 'Current Plan' : plan.priceId ? 'Subscribe' : 'Free Plan'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Info */}
        <View className="mx-6 mb-8 bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <Text className="text-gray-400 text-xs leading-5">
            • Subscriptions are billed monthly{'\n'}
            • Cancel anytime from your account settings{'\n'}
            • Unused masters do not roll over{'\n'}
            • Secure payment powered by Stripe
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
