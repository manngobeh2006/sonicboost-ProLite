import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface OnboardingCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

export function OnboardingCard({ icon, title, description, iconColor, iconBg }: OnboardingCardProps) {
  return (
    <View style={{ width }} className="items-center justify-center px-8">
      <View className={`w-32 h-32 ${iconBg} rounded-full items-center justify-center mb-8`}>
        <Ionicons name={icon} size={64} color={iconColor} />
      </View>
      <Text className="text-white text-2xl font-bold text-center mb-4">{title}</Text>
      <Text className="text-gray-400 text-base text-center leading-6">{description}</Text>
    </View>
  );
}

interface OnboardingIndicatorProps {
  total: number;
  current: number;
}

export function OnboardingIndicator({ total, current }: OnboardingIndicatorProps) {
  return (
    <View className="flex-row items-center justify-center space-x-2">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`h-2 rounded-full ${
            index === current ? 'w-8 bg-purple-600' : 'w-2 bg-gray-700'
          }`}
        />
      ))}
    </View>
  );
}
