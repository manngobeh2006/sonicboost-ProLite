import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../state/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, signup } = useAuthStore();

  const handleSubmit = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, name);
      }

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 justify-center">
            {/* Logo/Title */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-purple-600 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="musical-notes" size={40} color="white" />
              </View>
              <Text className="text-white text-3xl font-bold">AudioMaster</Text>
              <Text className="text-gray-400 text-base mt-2">
                Professional Audio Mastering
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {!isLogin && (
                <View>
                  <Text className="text-white text-sm font-medium mb-2">Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#6B7280"
                    className="bg-gray-900 text-white px-4 py-4 rounded-xl text-base border border-gray-800"
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View>
                <Text className="text-white text-sm font-medium mb-2">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  className="bg-gray-900 text-white px-4 py-4 rounded-xl text-base border border-gray-800"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View>
                <Text className="text-white text-sm font-medium mb-2">Password</Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#6B7280"
                    className="bg-gray-900 text-white px-4 py-4 rounded-xl text-base border border-gray-800 pr-12"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </Pressable>
                </View>
              </View>

              {error ? (
                <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <Text className="text-red-400 text-sm">{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className="bg-purple-600 py-4 rounded-xl items-center mt-6 active:opacity-80"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-base font-semibold">
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </Pressable>

              <View className="flex-row justify-center items-center mt-6">
                <Text className="text-gray-400 text-sm">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <Pressable onPress={toggleMode}>
                  <Text className="text-purple-500 text-sm font-semibold">
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
