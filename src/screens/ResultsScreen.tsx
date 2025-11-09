import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Modal, Linking, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../state/authStore';
import { apiClient } from '../api/backend';
import { useAudioStore } from '../state/audioStore';
import { useAudioPlaybackStore } from '../state/audioPlaybackStore';
import { RootStackParamList } from '../navigation/types';
import { createMasteredSound, createOriginalSound, getGenreDisplayName, AudioGenre, analyzeAudioFile, calculateIntelligentMastering, processAudioFile } from '../utils/audioProcessing';
import { parseAudioCommand, applyAudioCommand } from '../utils/audioAI';

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
  const { stopAndClearAudio: stopGlobalAudio, setSound: setGlobalSound, setIsPlaying: setGlobalIsPlaying, currentFileId } = useAudioPlaybackStore();

  const [currentVersion, setCurrentVersion] = useState<AudioVersion>('mastered');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionCommand, setRevisionCommand] = useState('');
  const [isRunningRevision, setIsRunningRevision] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [justPurchasedOneTime, setJustPurchasedOneTime] = useState(false);

  const isPro = user?.subscriptionTier === 'pro' || user?.subscriptionStatus === 'pro';
  const isUnlimited = user?.subscriptionTier === 'unlimited' || user?.subscriptionStatus === 'unlimited';
  const hasPremium = isPro || isUnlimited; // Helper for any paid plan

  useEffect(() => {
    if (!file) {
      // File was deleted or doesn't exist - silently navigate back without error
      navigation.goBack();
    } else if (file.masteredUri) {
      // Pre-load mastered audio on screen open
      loadAudio(file.masteredUri, 'mastered');
    }
  }, [file, navigation]);

  useEffect(() => {
    return () => {
      // Only clean up if this screen's audio is the one currently playing
      if (sound && currentFileId === fileId) {
        sound.unloadAsync();
        stopGlobalAudio();
      }
    };
  }, [sound, currentFileId, fileId]);

  const loadAudio = async (uri: string, version: AudioVersion) => {
    try {
      // CRITICAL: Stop any globally playing audio first (prevents multiple audio playback)
      await stopGlobalAudio();
      
      if (sound) {
        await sound.unloadAsync();
      }

      setIsLoading(true);
      
      // Use enhanced audio processing for mastered version
      let newSound: Audio.Sound;
      try {
        if (version === 'mastered') {
          // CRITICAL: Get fresh file from store to ensure latest settings after revision
          const currentFile = useAudioStore.getState().files.find(f => f.id === fileId);
          const settings = currentFile?.masteringSettings || file?.masteringSettings || {
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
      // Register this sound globally so other screens know to stop it
      setGlobalSound(newSound, fileId);
      
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
      setIsLoading(false);
    } catch (error) {
      if (__DEV__) {
        console.warn('Audio load warning:', (error as Error)?.message);
      }
      Alert.alert('Error', 'Failed to load audio. Please try again.');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
      // Sync with global state for mini-player
      setGlobalIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setGlobalIsPlaying(false);
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
        setGlobalIsPlaying(false);
      } else {
        await sound.playAsync();
        setGlobalIsPlaying(true);
      }
    } catch (error) {
      // Silently handle playback errors - they're usually recoverable
      if (__DEV__) {
        console.warn('Playback warning:', (error as Error)?.message);
      }
    }
  };

  const skipBackward = async () => {
    if (!sound) return;
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(0, status.positionMillis - 10000); // 10 seconds back
        await sound.setPositionAsync(newPosition);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Skip backward warning:', (error as Error)?.message);
      }
    }
  };

  const skipForward = async () => {
    if (!sound) return;
    
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        const newPosition = Math.min(status.durationMillis, status.positionMillis + 10000); // 10 seconds forward
        await sound.setPositionAsync(newPosition);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Skip forward warning:', (error as Error)?.message);
      }
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
    setGlobalIsPlaying(false);
    
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

    // Check if user has subscription or a paid one-time order for this file
    if (!hasPremium) {
      try {
        const auth = await apiClient.authorizeDownload({ filename: file.originalFileName });
        if (!auth?.allowed) {
          setShowUpgradeModal(true);
          return;
        }
      } catch (e: any) {
        // If backend is offline, allow free users to download (graceful degradation)
        if (e?.message?.includes('Backend returned non-JSON') || e?.message?.includes('Cannot connect')) {
          console.warn('Backend offline, allowing download anyway');
          // Continue to download
        } else {
          setShowUpgradeModal(true);
          return;
        }
      }
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

      // Create clean filename for user: remove extension and add _enhanced
      const cleanName = file.originalFileName.replace(/\.[^/.]+$/, ''); // Remove extension
      const userFriendlyFilename = `${cleanName}_enhanced.${format}`;
      
      // Copy file to temp directory with clean name for better user experience
      const tempDir = `${FileSystem.documentDirectory}temp_downloads/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      const cleanUri = `${tempDir}${userFriendlyFilename}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: cleanUri,
      });

      await Sharing.shareAsync(cleanUri, {
        mimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        dialogTitle: `Download Enhanced Audio (${format.toUpperCase()})`,
        UTI: format === 'mp3' ? 'public.mp3' : 'public.wav',
      });
      
      // Clean up cache file after sharing
      try {
        await FileSystem.deleteAsync(cleanUri, { idempotent: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Share error:', (error as Error)?.message);
      }
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const startOneTimePurchase = async () => {
    if (!file) return;
    try {
      setIsCreatingCheckout(true);
      // Configurable one-time price (default $4.99)
      const fromEnv = Number(process.env.EXPO_PUBLIC_ONE_TIME_PRICE_CENTS || '499');
      const amountCents = Number.isFinite(fromEnv) && fromEnv >= 100 ? fromEnv : 499;
      const resp = await apiClient.createOneTimeCheckout({ filename: file.originalFileName, amountCents });
      if (resp?.url) {
        await Linking.openURL(resp.url);
        // Show upsell modal after payment (they'll see it when they return)
        setJustPurchasedOneTime(true);
        setShowUpgradeModal(false);
        // Delay showing upsell to give time for payment
        setTimeout(() => {
          setShowUpsellModal(true);
        }, 2000);
      } else {
        Alert.alert('Error', 'Failed to start checkout.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to start checkout');
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const runRevision = async () => {
    if (!file) return;
    if (!revisionCommand.trim()) {
      Alert.alert('Enter a command', 'Describe how you want the sound adjusted.');
      return;
    }

    // Check revision limit (3 per song for unlimited users)
    const revisionsUsed = (file as any).revisionUsed || 0;
    if (revisionsUsed >= 3) {
      Alert.alert(
        'Revision Limit Reached',
        'You\'ve used all 3 revisions for this song. This helps ensure optimal server performance.\n\nTip: Process a new version of the song to get 3 more revisions!'
      );
      return;
    }

    try {
      setIsRunningRevision(true);
      setRevisionCommand(''); // Clear input while processing
      
      // Stop current playback
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      
      // Reanalyze the CURRENT mastered audio (not original) to build upon existing enhancement
      const analysis = await analyzeAudioFile(file.masteredUri || file.originalUri, file.originalFileName);
      
      // Get current settings or use defaults
      const currentSettings = file.masteringSettings || calculateIntelligentMastering(analysis);
      
      // Parse user's natural language command
      const cmd = await parseAudioCommand(revisionCommand);
      if (cmd.type === 'unknown') {
        // Check if it's a rate limit error
        if (cmd.description?.includes('rate limit') || cmd.description?.includes('Rate limit')) {
          Alert.alert(
            'AI Temporarily Unavailable',
            'The AI revision feature is currently at capacity. You can still manually adjust your audio:\n\n' +
            '• Re-upload and process with different settings\n' +
            '• Try again in a few minutes\n\n' +
            'The audio you have now is fully enhanced and ready to download!'
          );
        } else {
          Alert.alert('Not understood', cmd.description);
        }
        setIsRunningRevision(false);
        return;
      }
      
      // Apply command to current settings (incremental adjustment)
      const newSettings = applyAudioCommand(currentSettings, cmd);

      // Re-process the audio with new settings (overwrite existing)
      const mp3Uri = file.masteredMp3Uri || file.masteredUri;
      const wavUri = file.masteredWavUri || file.masteredUri;
      
      if (mp3Uri) {
        await processAudioFile(file.originalUri, mp3Uri, newSettings);
      }
      if (wavUri) {
        await processAudioFile(file.originalUri, wavUri, newSettings);
      }

      // Update file with new settings and increment revision count
      const updatedRevisionsCount = revisionsUsed + 1;
      useAudioStore.getState().updateFile(file.id, { 
        masteringSettings: newSettings, 
        revisionUsed: updatedRevisionsCount > 0 
      });

      // Give a moment for file system to flush the reprocessed audio
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get fresh file reference after update
      const updatedFile = useAudioStore.getState().files.find(f => f.id === file.id);
      
      // Reload the audio player with updated file
      setCurrentVersion('mastered');
      if (updatedFile?.masteredUri) {
        await loadAudio(updatedFile.masteredUri, 'mastered');
      }

      setShowRevisionModal(false);
      
      const remainingRevisions = 3 - updatedRevisionsCount;
      Alert.alert(
        'Revision Applied! ✨',
        `Your audio has been reprocessed with: "${revisionCommand}"\n\n${remainingRevisions} revision${remainingRevisions !== 1 ? 's' : ''} remaining for this song.`
      );
    } catch (e: any) {
      if (__DEV__) {
        console.warn('Revision warning:', e?.message);
      }
      
      // Check if it's a rate limit error
      const errorMsg = e?.message || '';
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        Alert.alert(
          'AI Temporarily Unavailable',
          'The AI revision feature is currently at capacity. You can still manually adjust your audio:\n\n' +
          '• Re-upload and process with different settings\n' +
          '• Try again in a few minutes\n\n' +
          'The audio you have now is fully enhanced and ready to download!'
        );
      } else {
        Alert.alert('Revision failed', errorMsg || 'Could not apply revision. Please try again.');
      }
    } finally {
      setIsRunningRevision(false);
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
            Your audio has been enhanced successfully!
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
                Enhanced
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
              {currentVersion === 'original' ? 'Original Version' : 'Enhanced Version'}
            </Text>

            {/* Tempo Display */}
            {file?.tempo && file.tempo > 0 && (
              <View className="mb-4">
                <View className="bg-gray-800/50 rounded-xl p-3 mx-6">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="musical-notes" size={16} color="#9333EA" />
                    <Text className="text-gray-300 text-sm ml-2">Tempo: </Text>
                    <Text className="text-white text-sm font-semibold">~{file.tempo} BPM</Text>
                  </View>
                </View>
              </View>
            )}

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
              <Pressable 
                onPress={skipBackward}
                disabled={!sound || isLoading}
                className="w-14 h-14 bg-gray-800 rounded-full items-center justify-center active:opacity-70"
              >
                <Ionicons name="play-back" size={24} color={sound && !isLoading ? "white" : "#4B5563"} />
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

              <Pressable 
                onPress={skipForward}
                disabled={!sound || isLoading}
                className="w-14 h-14 bg-gray-800 rounded-full items-center justify-center active:opacity-70"
              >
                <Ionicons name="play-forward" size={24} color={sound && !isLoading ? "white" : "#4B5563"} />
            </Pressable>
          </View>
        </View>

        {/* Enhancement Info - Only show for enhanced version */}
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
                  {file?.tempo && file.tempo > 0 ? (
                    <View className="ml-4">
                      <Text className="text-purple-300 text-xs mb-1">Tempo</Text>
                      <Text className="text-white text-base font-semibold">~{file.tempo} BPM</Text>
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
          <Text className="text-white text-lg font-semibold mb-3">Download Enhanced Audio</Text>
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
          {/* Restore Download authorization */}
          {!hasPremium && (
            <View className="mt-3">
              <Pressable
                onPress={async () => {
                  try {
                    const resp = await apiClient.authorizeDownload({ filename: file.originalFileName });
                    if (resp?.allowed) {
                      Alert.alert('Access restored', 'You can now download this file.');
                    } else {
                      setShowUpgradeModal(true);
                    }
                  } catch (e: any) {
                    // If backend is offline, inform user but don't block
                    if (e?.message?.includes('Backend returned non-JSON') || e?.message?.includes('Cannot connect')) {
                      Alert.alert('Backend Unavailable', 'The backend is currently offline. You can still download your files.');
                    } else {
                      setShowUpgradeModal(true);
                    }
                  }
                }}
                className="bg-gray-800 rounded-2xl py-3 items-center border border-gray-700 active:opacity-80"
              >
                <Text className="text-white text-sm font-semibold">Restore Download Access</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mx-6 mb-8">
          {/* AI Revision (Unlimited Only) */}
          {isUnlimited && (
            <Pressable
              onPress={() => setShowRevisionModal(true)}
              className="bg-blue-600 rounded-2xl py-4 items-center mb-3 active:opacity-80"
            >
              <Text className="text-white text-base font-semibold">✨ AI Revision</Text>
              <Text className="text-blue-200 text-xs mt-1">
                3 revisions per song
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => navigation.navigate('Home')}
            className="bg-purple-600 rounded-2xl py-4 items-center active:opacity-80"
          >
            <Text className="text-white text-base font-semibold">Boost Another File</Text>
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
                Unlock Downloads
              </Text>
              <Text className="text-gray-400 text-sm text-center">
                Choose a subscription for unlimited downloads, or a one-time payment to download this specific file.
              </Text>
            </View>

            <View className="bg-gray-800 rounded-2xl p-4 mb-6">
              <Text className="text-white text-sm font-semibold mb-3">Pro includes:</Text>
              {[
                '50 enhancements per month',
                'High quality processing',
                'WAV export (lossless quality)',
                'Download history access',
                'Priority support',
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
              <Text className="text-white text-base font-semibold">View Plans</Text>
              <Text className="text-purple-200 text-xs mt-1">Starting at $11.99/mo</Text>
            </Pressable>

            {/* Only show one-time payment for free users */}
            {!hasPremium && (
              <Pressable
                onPress={startOneTimePurchase}
                disabled={isCreatingCheckout}
                className="bg-gray-800 rounded-2xl py-4 items-center mb-3 active:opacity-80 border border-gray-700"
              >
                {isCreatingCheckout ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-semibold">Pay Once - $4.99</Text>
                )}
              </Pressable>
            )}

            <Pressable
              onPress={() => setShowUpgradeModal(false)}
              className="py-3 items-center"
            >
              <Text className="text-gray-400 text-sm">Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Upsell Modal - After One-Time Purchase */}
      <Modal
        visible={showUpsellModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUpsellModal(false)}
      >
        <Pressable 
          className="flex-1 bg-black/90 items-center justify-center px-6"
          onPress={() => setShowUpsellModal(false)}
        >
          <Pressable 
            className="bg-gray-900 rounded-3xl p-8 w-full max-w-sm border-2 border-purple-600"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-green-500/20 rounded-full items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              </View>
              <Text className="text-white text-2xl font-bold mb-2 text-center">
                🎉 Download Unlocked!
              </Text>
            </View>

            {/* Value Prop */}
            <View className="bg-purple-600/10 border border-purple-600/30 rounded-2xl p-5 mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="bulb" size={20} color="#9333EA" />
                <Text className="text-purple-400 text-sm font-bold ml-2">💡 SMART TIP</Text>
              </View>
              <Text className="text-white text-base font-semibold mb-3">
                You paid $4.99 for this file.
              </Text>
              <Text className="text-gray-300 text-sm mb-4">
                With <Text className="text-purple-400 font-bold">Pro ($11.99/month)</Text>, you could process <Text className="text-white font-bold">50 files</Text>.
              </Text>
              <View className="bg-gray-800 rounded-xl p-3">
                <Text className="text-white text-xs text-center">
                  That's only <Text className="text-green-400 font-bold">$0.24 per file</Text>! 🚀
                </Text>
              </View>
            </View>

            {/* CTA Buttons */}
            <Pressable
              onPress={() => {
                setShowUpsellModal(false);
                navigation.navigate('Subscriptions');
              }}
              className="bg-purple-600 rounded-2xl py-4 items-center mb-3 active:opacity-80"
            >
              <Text className="text-white text-base font-bold">Upgrade to Pro - $11.99/mo</Text>
              <Text className="text-purple-200 text-xs mt-1">50 enhancements per month</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowUpsellModal(false)}
              className="py-3 items-center"
            >
              <Text className="text-gray-400 text-sm font-semibold">Maybe Later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Revision Modal */}
      <Modal
        visible={showRevisionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRevisionModal(false)}
      >
        <Pressable className="flex-1 bg-black/80 items-center justify-center px-6" onPress={() => setShowRevisionModal(false)}>
          <Pressable className="bg-gray-900 rounded-3xl p-8 w-full max-w-sm border border-gray-800" onPress={(e) => e.stopPropagation()}>
            <Text className="text-white text-xl font-bold mb-3 text-center">AI Revision</Text>
            <Text className="text-gray-400 text-xs mb-4 text-center">Describe one change (e.g., "boost 2kHz by 3dB" or "more bass")</Text>
            <TextInput
              value={revisionCommand}
              onChangeText={setRevisionCommand}
              placeholder="e.g., increase brightness by 20%"
              placeholderTextColor="#6B7280"
              className="bg-gray-800 text-white px-4 py-3 rounded-xl mb-4"
              editable={!isRunningRevision}
            />
            <Pressable
              onPress={runRevision}
              disabled={isRunningRevision || !revisionCommand.trim()}
              className={`rounded-2xl py-4 items-center mb-2 ${isRunningRevision || !revisionCommand.trim() ? 'bg-gray-700' : 'bg-blue-600'}`}
            >
              {isRunningRevision ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Apply Revision</Text>}
            </Pressable>
            <Pressable onPress={() => setShowRevisionModal(false)} className="py-2 items-center">
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
