import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View className="flex-1 bg-black items-center justify-center">
      <View className="w-24 h-24 bg-purple-600 rounded-3xl items-center justify-center mb-6">
        <Ionicons name="musical-notes" size={48} color="white" />
      </View>
      <ActivityIndicator size="large" color="#9333EA" />
      <Text className="text-gray-400 text-base mt-4">{message}</Text>
    </View>
  );
}
