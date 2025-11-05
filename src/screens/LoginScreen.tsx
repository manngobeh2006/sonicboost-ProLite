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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const { login, signup, forgotPassword } = useAuthStore();

  const handleSubmit = async () => {
    setError('');
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation for signup
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password, name);
        
        // If signup failed because user already exists, redirect to login
        if (!result.success && result.shouldRedirectToLogin) {
          setIsLogin(true);
          setError('An account with this email already exists. Please login instead.');
          return;
        }
      }

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setShowForgotPassword(false);
    setForgotPasswordMessage('');
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setError('Please enter your email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setForgotPasswordLoading(true);
    setError('');

    try {
      const result = await forgotPassword(forgotPasswordEmail);

      if (result.success) {
        setForgotPasswordMessage(result.message || 'Password reset instructions sent to your email');
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
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
              <Text className="text-white text-3xl font-bold">SonicBoost ProLite</Text>
              <Text className="text-gray-400 text-base mt-2">
                AI-Powered Audio Enhancement
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {showForgotPassword ? (
                // Forgot Password Form
                <View className="space-y-4">
                  <View className="items-center mb-4">
                    <Text className="text-white text-xl font-bold mb-2">Reset Password</Text>
                    <Text className="text-gray-400 text-center">
                      Enter your email address and we'll send you a link to reset your password.
                    </Text>
                  </View>

                  <View>
                    <Text className="text-white text-sm font-medium mb-2">Email</Text>
                    <TextInput
                      value={forgotPasswordEmail}
                      onChangeText={setForgotPasswordEmail}
                      placeholder="Enter your email"
                      placeholderTextColor="#6B7280"
                      className="bg-gray-900 text-white px-4 py-4 rounded-xl text-base border border-gray-800"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {forgotPasswordMessage ? (
                    <View className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                      <Text className="text-green-400 text-sm">{forgotPasswordMessage}</Text>
                    </View>
                  ) : null}

                  {error ? (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <Text className="text-red-400 text-sm">{error}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    className="bg-purple-600 py-4 rounded-xl items-center mt-6 active:opacity-80"
                  >
                    {forgotPasswordLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-base font-semibold">Send Reset Link</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordMessage('');
                      setError('');
                    }}
                    className="py-2"
                  >
                    <Text className="text-purple-500 text-sm font-semibold text-center">
                      Back to Login
                    </Text>
                  </Pressable>
                </View>
              ) : (
                // Login/Signup Form
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

                  {isLogin && (
                    <Pressable
                      onPress={() => {
                        setShowForgotPassword(true);
                        setForgotPasswordEmail(email);
                        setError('');
                      }}
                      className="self-end"
                    >
                      <Text className="text-purple-500 text-sm font-semibold">
                        Forgot Password?
                      </Text>
                    </Pressable>
                  )}

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
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
