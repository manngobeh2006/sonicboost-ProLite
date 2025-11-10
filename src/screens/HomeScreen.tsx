import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { useAudioStore } from '../state/audioStore';
import { useAudioPlaybackStore } from '../state/audioPlaybackStore';
import { RootStackParamList } from '../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { addFile, lastCompletedFileId, files, hasProcessedInSession } = useAudioStore();
  const { stopAndClearAudio } = useAudioPlaybackStore();
  const [loading, setLoading] = useState(false);

  // Check if there's a recent completed file to return to
  const lastCompletedFile = lastCompletedFileId ? files.find(f => f.id === lastCompletedFileId) : null;
  const canReturnToResults = hasProcessedInSession && lastCompletedFile && lastCompletedFile.status === 'completed';

  const handlePickAudioFile = async () => {
    try {
      // Stop any currently playing audio preview
      await stopAndClearAudio();
      
      setLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];

      // Validate file
      if (!file.mimeType?.startsWith('audio/')) {
        Alert.alert('Invalid File', 'Please select an audio file');
        setLoading(false);
        return;
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Could not read file');
        setLoading(false);
        return;
      }

      // Get audio duration
      let duration: number | undefined;
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: file.uri });
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          duration = status.durationMillis ? status.durationMillis / 1000 : undefined;
        }
        await sound.unloadAsync();
      } catch (err) {
        console.log('Could not get duration', err);
      }

      // Create audio file record
      const audioFile = addFile({
        userId: user!.id,
        originalFileName: file.name,
        originalUri: file.uri,
        status: 'uploaded',
        progress: 0,
        duration,
        fileSize: fileInfo.size,
      });

      setLoading(false);

      // Navigate to mastering screen
      navigation.navigate('Mastering', { fileId: audioFile.id });
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick audio file');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-8">
          <Text className="text-white text-3xl font-bold">SonicBoost ProLite</Text>
          <Text className="text-gray-400 text-base mt-2">
            Boost clarity, depth, and loudness for a more powerful sound
          </Text>
        </View>

        {/* Return to Last Results */}
        {canReturnToResults && (
          <View className="mx-6 mb-4">
            <Pressable
              onPress={() => navigation.navigate('Results', { fileId: lastCompletedFileId! })}
              className="bg-purple-600/20 border-2 border-purple-600 rounded-2xl p-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-purple-600 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="headset" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-semibold mb-1">Return to Last Results</Text>
                  <Text className="text-purple-300 text-xs" numberOfLines={1}>
                    {lastCompletedFile?.originalFileName}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9333EA" />
            </Pressable>
          </View>
        )}

        {/* Desktop Early Access Banner - Pro Users */}
        {(user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'unlimited' || user?.subscriptionStatus === 'pro' || user?.subscriptionStatus === 'unlimited') && (
          <View className="mx-6 mb-4">
            <View className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 rounded-2xl p-5">
              <View className="flex-row items-start">
                <View className="w-12 h-12 bg-blue-600 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="desktop" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-white text-base font-bold">Desktop Coming Soon</Text>
                    <View className="bg-blue-600 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-white text-xs font-bold">BETA</Text>
                    </View>
                  </View>
                  <Text className="text-gray-300 text-sm mb-2">
                    OneClickMaster Desktop with real DSP engine - included in your Pro subscription
                  </Text>
                  <Text className="text-blue-300 text-xs">
                    ✨ Early access for current Pro members
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Upload Card */}
        <View className="mx-6 mb-8">
          <Pressable
            onPress={handlePickAudioFile}
            disabled={loading}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-8 items-center border-2 border-purple-500 border-dashed active:opacity-80"
            style={{
              backgroundColor: '#7C3AED',
            }}
          >
            {loading ? (
              <ActivityIndicator size="large" color="white" />
            ) : (
              <>
                <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
                  <Ionicons name="cloud-upload" size={40} color="white" />
                </View>
                <Text className="text-white text-xl font-bold mb-2">Boost Your Audio</Text>
                <Text className="text-purple-200 text-sm text-center">
                  Tap to select an audio file and boost clarity, depth, and loudness
                </Text>
                <View className="flex-row items-center mt-4 bg-white/10 px-4 py-2 rounded-full">
                  <Ionicons name="musical-note" size={16} color="white" />
                  <Text className="text-white text-xs ml-2">MP3, WAV, M4A, AAC</Text>
                </View>
              </>
            )}
          </Pressable>
        </View>

        {/* Features */}
        <View className="mx-6 mb-8">
          <Text className="text-white text-xl font-bold mb-4">Features</Text>
          <View className="space-y-3">
            <View className="bg-gray-900 rounded-2xl p-4 flex-row items-start border border-gray-800">
              <View className="w-12 h-12 bg-purple-600/20 rounded-xl items-center justify-center mr-4">
                <Ionicons name="volume-high" size={24} color="#9333EA" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold mb-1">
                  Instant Audio Boost
                </Text>
                <Text className="text-gray-400 text-sm">
                  Enhance clarity, depth, and loudness with one click
                </Text>
              </View>
            </View>

            <View className="bg-gray-900 rounded-2xl p-4 flex-row items-start border border-gray-800">
              <View className="w-12 h-12 bg-blue-600/20 rounded-xl items-center justify-center mr-4">
                <Ionicons name="git-compare" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold mb-1">
                  Before & After Preview
                </Text>
                <Text className="text-gray-400 text-sm">
                  Compare original and boosted versions instantly
                </Text>
              </View>
            </View>

            <View className="bg-gray-900 rounded-2xl p-4 flex-row items-start border border-gray-800">
              <View className="w-12 h-12 bg-green-600/20 rounded-xl items-center justify-center mr-4">
                <Ionicons name="download" size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold mb-1">
                  Multiple Formats
                </Text>
                <Text className="text-gray-400 text-sm">
                  Download in both MP3 and WAV formats
                </Text>
              </View>
            </View>

            <View className="bg-gray-900 rounded-2xl p-4 flex-row items-start border border-gray-800">
              <View className="w-12 h-12 bg-yellow-600/20 rounded-xl items-center justify-center mr-4">
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold mb-1">
                  Processing History
                </Text>
                <Text className="text-gray-400 text-sm">
                  Access all your boosted files anytime
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-6 mb-8">
          <Text className="text-white text-xl font-bold mb-4">Quick Actions</Text>
          <View className="flex-row space-x-3">
            <Pressable
              onPress={() => navigation.navigate('History')}
              className="flex-1 bg-gray-900 rounded-2xl p-4 items-center border border-gray-800 active:opacity-70"
            >
              <Ionicons name="time" size={28} color="#9333EA" />
              <Text className="text-white text-sm font-semibold mt-2">History</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Profile')}
              className="flex-1 bg-gray-900 rounded-2xl p-4 items-center border border-gray-800 active:opacity-70"
            >
              <Ionicons name="person" size={28} color="#9333EA" />
              <Text className="text-white text-sm font-semibold mt-2">Profile</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
