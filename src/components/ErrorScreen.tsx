import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface ErrorScreenProps {
  error: Error;
  resetError?: () => void;
}

export default function ErrorScreen({ error, resetError }: ErrorScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-24 h-24 bg-red-500/20 rounded-full items-center justify-center mb-6">
          <Ionicons name="warning" size={48} color="#EF4444" />
        </View>

        <Text className="text-white text-2xl font-bold mb-2">Something went wrong</Text>
        <Text className="text-gray-400 text-sm text-center mb-8">
          {error.message || "An unexpected error occurred"}
        </Text>

        {resetError && (
          <Pressable
            onPress={resetError}
            className="bg-purple-600 rounded-2xl px-8 py-4 active:opacity-80"
          >
            <Text className="text-white text-base font-semibold">Try Again</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
