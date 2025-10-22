import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../state/authStore';
import { useAudioStore } from '../state/audioStore';
import { RootStackParamList } from '../navigation/types';
import { createMasteredSound, createOriginalSound, getGenreDisplayName, AudioGenre } from '../utils/audioProcessing';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;
type ResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;

type AudioVersion = 'original' | 'mastered';

export default function ResultsScreen() {
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const { fileId } = route.params;
  const { user } = useAuthStore();

  const { files } = useAudioStore();
  const file = files.find((f) => f.id === fileId);

  const [currentVersion, setCurrentVersion] = useState<AudioVersion>('mastered');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isPro = user?.subscriptionTier === 'pro' || user?.subscriptionStatus === 'pro';

  useEffect(() => {
    if (!file) {
      Alert.alert('Error', 'File not found');
      navigation.goBack();
    } else if (file.masteredUri) {
      // Pre-load mastered audio on screen open
      loadAudio(file.masteredUri, 'mastered');
    }
  }, [file, navigation]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async (uri: string, version: AudioVersion) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      setIsLoading(true);
      
      // Use enhanced audio processing for mastered version
      let newSound: Audio.Sound;
      try {
        if (version === 'mastered') {
          // Use stored mastering settings from the file
          const settings = file?.masteringSettings || {
            volumeBoost: 0.8,
            brightness: 0.7,
            midRange: 0.7,
            bassBoost: 0.6,
            compression: 0.6,
            pitchShift: 0.5,
          };
          newSound = await createMasteredSound(uri, settings);
        } else {
          newSound = await createOriginalSound(uri);
        }
      } catch (processingError) {
        console.log('Audio processing failed, using standard playback:', processingError);
        // Fallback to standard playback if processing fails
        const { sound: fallbackSound } = await Audio.Sound.createAsync(
          { uri },
          { 
            volume: version === 'mastered' ? 1.0 : 0.5,
            shouldPlay: false 
          }
        );
        newSound = fallbackSound;
      }

      // Set up playback status callback
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      setSound(newSound);
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Error', 'Failed to load audio. Please try again.');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      const uri = currentVersion === 'original' ? file?.originalUri : file?.masteredUri;
      if (uri) {
        await loadAudio(uri, currentVersion);
        // The sound is now loaded, we need to get it and play
        return;
      }
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const switchVersion = async (version: AudioVersion) => {
    if (version === currentVersion) return;

    // Stop current playback
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }

    setCurrentVersion(version);
    setPosition(0);
    setIsPlaying(false);
    
    // Pre-load the new version for instant playback
    const uri = version === 'original' ? file?.originalUri : file?.masteredUri;
    if (uri) {
      await loadAudio(uri, version);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (format: 'mp3' | 'wav') => {
    if (!file) return;

    // Check if user is trying to download WAV without Pro
    if (format === 'wav' && !isPro) {
      setShowUpgradeModal(true);
      return;
    }

    const uri = format === 'mp3' ? file.masteredMp3Uri : file.masteredWavUri;
    if (!uri) {
      Alert.alert('Error', 'File not found');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        dialogTitle: `Download Mastered Audio (${format.toUpperCase()})`,
        UTI: format === 'mp3' ? 'public.mp3' : 'public.wav',
      });
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to download file');
    }
  };

  if (!file) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#9333EA" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-6 flex-row items-center justify-between">
          <Pressable onPress={() => navigation.navigate('Home')} className="flex-row items-center">
            <Ionicons name="arrow-back" size={24} color="white" />
            <Text className="text-white text-xl font-bold ml-3">Results</Text>
          </Pressable>
          <View className="bg-green-500/20 px-3 py-1 rounded-full">
            <Text className="text-green-400 text-xs font-semibold">COMPLETED</Text>
          </View>
        </View>

        {/* Success Message */}
        <View className="mx-6 mb-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex-row items-center">
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text className="text-green-400 text-sm font-semibold ml-3">
            Your audio has been mastered successfully!
          </Text>
        </View>

        {/* Version Selector */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-3">Compare Versions</Text>
          <View className="flex-row bg-gray-900 rounded-2xl p-2 border border-gray-800">
            <Pressable
              onPress={() => switchVersion('original')}
              className={`flex-1 py-3 rounded-xl items-center ${
                currentVersion === 'original' ? 'bg-gray-700' : ''
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  currentVersion === 'original' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Original
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchVersion('mastered')}
              className={`flex-1 py-3 rounded-xl items-center ${
                currentVersion === 'mastered' ? 'bg-purple-600' : ''
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  currentVersion === 'mastered' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Mastered
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Audio Player */}
        <View className="mx-6 mb-6">
          <View className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
            {/* Artwork */}
            <View className="items-center mb-6">
              <View
                className={`w-48 h-48 rounded-3xl items-center justify-center ${
                  currentVersion === 'original' ? 'bg-gray-700' : 'bg-purple-600'
                }`}
              >
                <Ionicons
                  name="musical-notes"
                  size={80}
                  color="white"
                />
              </View>
            </View>

            {/* Title */}
            <Text className="text-white text-lg font-bold text-center mb-2" numberOfLines={2}>
              {file.originalFileName}
            </Text>
            <Text className="text-gray-400 text-sm text-center mb-6">
              {currentVersion === 'original' ? 'Original Version' : 'Mastered Version'}
            </Text>

            {/* Progress Bar */}
            <View className="mb-6">
              <View className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    currentVersion === 'original' ? 'bg-gray-500' : 'bg-purple-600'
                  }`}
                  style={{ width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }}
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-400 text-xs">{formatTime(position)}</Text>
                <Text className="text-gray-400 text-xs">{formatTime(duration)}</Text>
              </View>
            </View>

            {/* Controls */}
            <View className="flex-row items-center justify-center space-x-6">
              <Pressable className="w-14 h-14 bg-gray-800 rounded-full items-center justify-center active:opacity-70">
                <Ionicons name="play-skip-back" size={24} color="white" />
              </Pressable>

              <Pressable
                onPress={togglePlayPause}
                disabled={isLoading}
                className={`w-20 h-20 rounded-full items-center justify-center active:opacity-80 ${
                  currentVersion === 'original' ? 'bg-gray-700' : 'bg-purple-600'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="white" />
                )}
              </Pressable>

              <Pressable className="w-14 h-14 bg-gray-800 rounded-full items-center justify-center active:opacity-70">
                <Ionicons name="play-skip-forward" size={24} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Enhancement Info - Only show for mastered version */}
        {currentVersion === 'mastered' && (
          <View className="mx-6 mb-6 bg-purple-600/10 border border-purple-600/30 rounded-2xl p-4">
            {/* Genre Detection */}
            {file?.genre && (
              <View className="bg-purple-600/20 rounded-xl p-3 mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-purple-300 text-xs mb-1">Detected Genre</Text>
                    <Text className="text-white text-base font-semibold">
                      {getGenreDisplayName(file.genre as AudioGenre)}
                    </Text>
                  </View>
                  {file?.tempo && file.tempo > 0 && isPro ? (
                    <View className="ml-4">
                      <Text className="text-purple-300 text-xs mb-1">Tempo</Text>
                      <Text className="text-white text-base font-semibold">{file.tempo} BPM</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
            
            <View className="flex-row items-center mb-3">
              <Ionicons name="flash" size={20} color="#9333EA" />
              <Text className="text-purple-400 text-sm font-semibold ml-2">
                Intelligent Enhancements Applied
              </Text>
            </View>
            <View className="space-y-2">
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                <Text className="text-gray-300 text-xs flex-1">
                  Genre-optimized loudness maximization
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                <Text className="text-gray-300 text-xs flex-1">
                  Adaptive brightness enhancement
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                <Text className="text-gray-300 text-xs flex-1">
                  Mid-range preservation for vocal clarity
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                <Text className="text-gray-300 text-xs flex-1">
                  Tempo-aware dynamic processing
                </Text>
              </View>
            </View>
          </View>
        )}
        </View>

        {/* Download Section */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-3">Download Mastered Audio</Text>
          <View className="space-y-3">
            <Pressable
              onPress={() => handleDownload('mp3')}
              className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between border border-gray-800 active:opacity-70"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-purple-600/20 rounded-xl items-center justify-center mr-4">
                  <Ionicons name="download" size={24} color="#9333EA" />
                </View>
                <View>
                  <Text className="text-white text-base font-semibold">Download MP3</Text>
                  <Text className="text-gray-400 text-xs">Compressed format, smaller file size</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </Pressable>

            <Pressable
              onPress={() => handleDownload('wav')}
              className="bg-gray-900 rounded-2xl p-4 flex-row items-center justify-between border border-gray-800 active:opacity-70"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-600/20 rounded-xl items-center justify-center mr-4">
                  <Ionicons name="download" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-white text-base font-semibold">Download WAV</Text>
                  <Text className="text-gray-400 text-xs">Lossless format, studio quality</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-6 mb-8">
          <Pressable
            onPress={() => navigation.navigate('Home')}
            className="bg-purple-600 rounded-2xl py-4 items-center active:opacity-80"
          >
            <Text className="text-white text-base font-semibold">Master Another File</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <Pressable 
          className="flex-1 bg-black/80 items-center justify-center px-6"
          onPress={() => setShowUpgradeModal(false)}
        >
          <Pressable className="bg-gray-900 rounded-3xl p-8 w-full max-w-sm border border-gray-800">
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-purple-600/20 rounded-full items-center justify-center mb-4">
                <Ionicons name="lock-closed" size={40} color="#9333EA" />
              </View>
              <Text className="text-white text-2xl font-bold mb-2 text-center">
                Upgrade to Pro
              </Text>
              <Text className="text-gray-400 text-sm text-center">
                WAV export is a Pro feature. Upgrade now to unlock lossless audio exports and more.
              </Text>
            </View>

            <View className="bg-gray-800 rounded-2xl p-4 mb-6">
              <Text className="text-white text-sm font-semibold mb-3">Pro includes:</Text>
              {[
                'WAV export (lossless quality)',
                'Unlimited masters',
                'Download history access',
                'Tempo analysis',
                'Reference song upload',
              ].map((feature, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text className="text-gray-300 text-xs ml-2 flex-1">{feature}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('Subscriptions');
              }}
              className="bg-purple-600 rounded-2xl py-4 items-center mb-3 active:opacity-80"
            >
              <Text className="text-white text-base font-semibold">Upgrade Now - $9.99/mo</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowUpgradeModal(false)}
              className="py-3 items-center"
            >
              <Text className="text-gray-400 text-sm">Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
