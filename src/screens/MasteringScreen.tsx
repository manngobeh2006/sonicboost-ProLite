import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../state/authStore';
import { useAudioStore } from '../state/audioStore';
import { useAudioPlaybackStore } from '../state/audioPlaybackStore';
import { RootStackParamList } from '../navigation/types';
import { processAudioFile, analyzeAudioFile, calculateIntelligentMastering, getGenreDisplayName, analyzeReferenceTrack, calculateReferenceBasedMastering, AudioAnalysis, MasteringSettings } from '../utils/audioProcessing';
import { parseAudioCommand, applyAudioCommand, generateAudioAnalysisDescription, generateMixingTips, generatePreMasteringTips } from '../utils/audioAI';

type MasteringScreenRouteProp = RouteProp<RootStackParamList, 'Mastering'>;
type MasteringScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Mastering'>;

export default function MasteringScreen() {
  const route = useRoute<MasteringScreenRouteProp>();
  const navigation = useNavigation<MasteringScreenNavigationProp>();
  const { fileId } = route.params;
  const { user } = useAuthStore();
  
  const { files, updateFile, setLastCompletedFileId, setHasProcessedInSession } = useAudioStore();
  const file = files.find((f) => f.id === fileId);
  const { stopAndClearAudio } = useAudioPlaybackStore();

  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [referenceTrack, setReferenceTrack] = useState<{uri: string, name: string} | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [analysisDescription, setAnalysisDescription] = useState<string>('');
  const [mixingTips, setMixingTips] = useState<string[]>([]);
  const [preMasteringTips, setPreMasteringTips] = useState<string[]>([]);
  const [customMasteringSettings, setCustomMasteringSettings] = useState<MasteringSettings | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [processingCommand, setProcessingCommand] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);

  const isPro = user?.subscriptionTier === 'pro' || user?.subscriptionStatus === 'pro';
  const isUnlimited = user?.subscriptionTier === 'unlimited' || user?.subscriptionStatus === 'unlimited';
  const hasPremium = isPro || isUnlimited; // Any paid tier

  useEffect(() => {
    if (!file) {
      // File was deleted or doesn't exist - silently navigate back without error
      navigation.goBack();
    }
  }, [file, navigation]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProcessAudioCommand = async () => {
    if (!commandInput.trim()) return;

    setProcessingCommand(true);
    try {
      const command = await parseAudioCommand(commandInput);

      if (command.type === 'unknown') {
        Alert.alert('Command not understood', command.description);
        setProcessingCommand(false);
        return;
      }

      // Apply the command to current or default settings
      const baseSettings = customMasteringSettings || (audioAnalysis ? calculateIntelligentMastering(audioAnalysis) : {
        volumeBoost: 0.8,
        brightness: 0.7,
        midRange: 0.7,
        bassBoost: 0.6,
        compression: 0.6,
        pitchShift: 0.5,
      });

      const newSettings = applyAudioCommand(baseSettings, command);
      setCustomMasteringSettings(newSettings);

      Alert.alert('Command Applied', command.description);
      setCommandInput('');
    } catch (error) {
      console.error('Error processing command:', error);
      Alert.alert('Error', 'Failed to process command');
    }
    setProcessingCommand(false);
  };

  const loadAIInsights = async (analysis: AudioAnalysis) => {
    setLoadingTips(true);
    try {
      // Generate all AI insights in parallel
      const [description, mixing, preMastering] = await Promise.all([
        generateAudioAnalysisDescription(analysis),
        generateMixingTips(analysis, false),
        generatePreMasteringTips(analysis),
      ]);

      setAnalysisDescription(description);
      setMixingTips(mixing);
      setPreMasteringTips(preMastering);
    } catch (error) {
      console.error('Error loading AI insights:', error);
    }
    setLoadingTips(false);
  };

  const handlePickReferenceTrack = async () => {
    if (!hasPremium) {
      Alert.alert(
        'Premium Feature',
        'Reference track upload is available for Pro and Unlimited users. Upgrade now to unlock this feature.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscriptions') },
        ]
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const refFile = result.assets[0];

      // Validate file
      if (!refFile.mimeType?.startsWith('audio/')) {
        Alert.alert('Invalid File', 'Please select an audio file');
        return;
      }

      setReferenceTrack({
        uri: refFile.uri,
        name: refFile.name,
      });

      Alert.alert(
        'Reference Track Added',
        `${refFile.name} will be analyzed and used to enhance your audio.`
      );
    } catch (error) {
      console.error('Error picking reference track:', error);
      Alert.alert('Error', 'Failed to select reference track');
    }
  };

  const simulateSonicBoostProcessing = async () => {
    if (!file) return;

    // Stop any currently playing audio preview
    await stopAndClearAudio();

    setProcessing(true);
    updateFile(file.id, { status: 'processing', progress: 0 });

    try {
      // Stage 1: Analyzing audio characteristics
      setCurrentStage('Analyzing audio file...');
      for (let i = 0; i <= 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        updateFile(file.id, { progress: i });
      }

      // Analyze audio to detect genre, tempo, and characteristics
      const audioAnalysisResult = await analyzeAudioFile(file.originalUri, file.originalFileName);
      setAudioAnalysis(audioAnalysisResult);

      // Load AI insights in background (non-blocking)
      loadAIInsights(audioAnalysisResult);

      // Calculate mastering settings
      let masteringSettings;
      let stageMessage = `Enhancing clarity for ${getGenreDisplayName(audioAnalysisResult.genre)}...`;

      if (customMasteringSettings) {
        // Use custom settings from AI commands
        masteringSettings = customMasteringSettings;
        stageMessage = 'Applying your custom settings...';
        console.log('Using custom AI-adjusted mastering settings');
      } else if (referenceTrack) {
        // Reference-based mastering with error handling
        setCurrentStage('Analyzing reference track...');
        try {
          const referenceAnalysis = await analyzeReferenceTrack(referenceTrack.uri);

          // Calculate reference-based mastering settings
          masteringSettings = calculateReferenceBasedMastering(audioAnalysisResult, referenceAnalysis);
          stageMessage = 'Matching reference sound...';

          console.log('Using reference-based mastering');
        } catch (refError) {
          console.error('Reference track analysis failed, falling back to genre-based mastering:', refError);
          // Fall back to genre-based mastering if reference analysis fails
          masteringSettings = calculateIntelligentMastering(audioAnalysisResult);
          stageMessage = `Enhancing clarity for ${getGenreDisplayName(audioAnalysisResult.genre)}...`;
        }
      } else {
        // Genre-based intelligent mastering
        masteringSettings = calculateIntelligentMastering(audioAnalysisResult);
      }

      console.log('Detected genre:', audioAnalysisResult.genre, 'Tempo:', audioAnalysisResult.tempo);

      // Stage 2: Processing tone and frequency
      setCurrentStage(stageMessage);
      for (let i = 21; i <= 50; i++) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        updateFile(file.id, { progress: i });
      }

      // Stage 3: Adjusting dynamics and preserving vocals
      setCurrentStage('Boosting loudness and dynamics...');
      for (let i = 51; i <= 75; i++) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        updateFile(file.id, { progress: i });
      }

      // Stage 4: Finalizing
      setCurrentStage('Finalizing audio boost...');
      for (let i = 76; i <= 90; i++) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        updateFile(file.id, { progress: i });
      }

      // Create mastered versions with audio processing
      const fileDir = `${FileSystem.documentDirectory}mastered/`;
      await FileSystem.makeDirectoryAsync(fileDir, { intermediates: true });

      const mp3Uri = `${fileDir}${file.id}_mastered.mp3`;
      const wavUri = `${fileDir}${file.id}_mastered.wav`;

      // Process audio files (this copies them and marks them for enhanced playback)
      await processAudioFile(file.originalUri, mp3Uri, masteringSettings);
      await processAudioFile(file.originalUri, wavUri, masteringSettings);

      // Stage 5: Complete
      setCurrentStage('Complete!');
      for (let i = 91; i <= 100; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        updateFile(file.id, { progress: i });
      }

      updateFile(file.id, {
        status: 'completed',
        progress: 100,
        masteredUri: mp3Uri,
        masteredMp3Uri: mp3Uri,
        masteredWavUri: wavUri,
        completedAt: new Date().toISOString(),
        genre: audioAnalysisResult.genre,
        tempo: audioAnalysisResult.tempo,
        masteringSettings: masteringSettings,
      });

      // Track this as the last completed file for navigation
      setLastCompletedFileId(file.id);
      setHasProcessedInSession(true); // Mark that user has processed a file in this session

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate to results screen
      navigation.replace('Results', { fileId: file.id });
    } catch (error) {
      console.error('Mastering error:', error);
      updateFile(file.id, {
        status: 'failed',
        error: 'Failed to process audio file',
      });
      Alert.alert('Error', 'Failed to process audio file');
      setProcessing(false);
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
        <View className="px-6 py-6 flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-2xl font-bold">Enhance Audio</Text>
        </View>

        {/* File Info Card */}
        <View className="mx-6 mb-8 bg-gray-900 rounded-3xl p-6 border border-gray-800">
          <View className="items-center mb-6">
            <View className="w-24 h-24 bg-purple-600/20 rounded-3xl items-center justify-center mb-4">
              <Ionicons name="musical-notes" size={48} color="#9333EA" />
            </View>
            <Text className="text-white text-lg font-bold text-center" numberOfLines={2}>
              {file.originalFileName}
            </Text>
          </View>

          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-3 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">Duration</Text>
              <Text className="text-white text-sm font-semibold">
                {formatDuration(file.duration)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3 border-b border-gray-800">
              <Text className="text-gray-400 text-sm">File Size</Text>
              <Text className="text-white text-sm font-semibold">
                {formatFileSize(file.fileSize)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3">
              <Text className="text-gray-400 text-sm">Status</Text>
              <View
                className={`px-3 py-1 rounded-full ${
                  file.status === 'uploaded'
                    ? 'bg-blue-500/20'
                    : file.status === 'processing'
                    ? 'bg-purple-500/20'
                    : 'bg-green-500/20'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    file.status === 'uploaded'
                      ? 'text-blue-400'
                      : file.status === 'processing'
                      ? 'text-purple-400'
                      : 'text-green-400'
                  }`}
                >
                  {file.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Processing Status */}
        {processing && (
          <View className="mx-6 mb-8">
            <View className="bg-purple-600/10 border border-purple-600/30 rounded-3xl p-6">
              <Text className="text-white text-lg font-bold mb-4">Processing</Text>
              
              {/* Progress Bar */}
              <View className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-purple-400 text-sm">{currentStage}</Text>
                  <Text className="text-purple-400 text-sm font-bold">{file.progress}%</Text>
                </View>
                <View className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${file.progress}%` }}
                  />
                </View>
              </View>

              {/* Processing Stages Indicator */}
              <View className="flex-row justify-between mt-4">
                {[
                  { label: 'Analyze', range: [0, 20] },
                  { label: 'Tone', range: [21, 50] },
                  { label: 'Dynamics', range: [51, 75] },
                  { label: 'Export', range: [76, 100] },
                ].map((stage, index) => {
                  const isActive =
                    file.progress >= stage.range[0] && file.progress <= stage.range[1];
                  const isCompleted = file.progress > stage.range[1];

                  return (
                    <View key={index} className="items-center flex-1">
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${
                          isCompleted
                            ? 'bg-purple-600'
                            : isActive
                            ? 'bg-purple-600'
                            : 'bg-gray-800'
                        }`}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={20} color="white" />
                        ) : (
                          <Text className="text-white text-xs font-bold">{index + 1}</Text>
                        )}
                      </View>
                      <Text
                        className={`text-xs ${
                          isActive || isCompleted ? 'text-purple-400' : 'text-gray-500'
                        }`}
                      >
                        {stage.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Reference Track Section (Pro Only) */}
        {file.status === 'uploaded' && !processing && (
          <View className="mx-6 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white text-lg font-semibold">Reference Track</Text>
              {!hasPremium && (
                <View className="bg-purple-600 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">PREMIUM</Text>
                </View>
              )}
            </View>
            
            {referenceTrack ? (
              <View className="bg-gray-900 rounded-2xl p-4 border border-purple-600 mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 bg-purple-600/20 rounded-xl items-center justify-center mr-3">
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-sm font-semibold mb-1">Reference Set</Text>
                      <Text className="text-gray-400 text-xs" numberOfLines={1}>
                        {referenceTrack.name}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setReferenceTrack(null)}
                    className="w-8 h-8 items-center justify-center"
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handlePickReferenceTrack}
                className={`rounded-2xl p-5 border-2 border-dashed mb-4 ${
                  hasPremium ? 'bg-purple-600/5 border-purple-600' : 'bg-gray-900 border-gray-700'
                }`}
              >
                <View className="items-center">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
                    hasPremium ? 'bg-purple-600/20' : 'bg-gray-800'
                  }`}>
                    <Ionicons 
                      name={hasPremium ? "cloud-upload" : "lock-closed"} 
                      size={32} 
                      color={hasPremium ? "#9333EA" : "#6B7280"} 
                    />
                  </View>
                  <Text className={`text-base font-semibold mb-1 ${
                    hasPremium ? 'text-white' : 'text-gray-400'
                  }`}>
                    {hasPremium ? 'Upload Reference Track (Optional)' : 'Reference Track Upload'}
                  </Text>
                  <Text className="text-gray-500 text-xs text-center">
                    {hasPremium 
                      ? 'Upload a professionally enhanced reference song to match its sonic characteristics'
                      : 'Upgrade to Premium to unlock reference-based enhancement'
                    }
                  </Text>
                </View>
              </Pressable>
            )}

            {referenceTrack && (
              <View className="bg-purple-600/10 border border-purple-600/30 rounded-2xl p-4 mb-4">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#9333EA" />
                  <Text className="text-purple-300 text-xs ml-2 flex-1 leading-5">
                    Your audio will be analyzed against the reference track and enhanced to match its loudness, frequency balance, stereo width, and dynamics - but even better!
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* AI Assistant removed from initial processing. Now available as post-processing revision in Results screen. */}

        {/* Start Button */}
        {file.status === 'uploaded' && !processing && (
          <View className="mx-6 mb-8">
            <Pressable
              onPress={simulateSonicBoostProcessing}
              className="bg-purple-600 rounded-3xl py-5 items-center active:opacity-80"
            >
              <Text className="text-white text-lg font-bold">Boost Audio</Text>
            </Pressable>
          </View>
        )}

        {/* Info Section */}
        <View className="mx-6 mb-8">
          <Text className="text-white text-lg font-semibold mb-4">What happens next?</Text>
          <View className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <Text className="text-gray-400 text-sm leading-6">
              Our AI-powered enhancement engine will analyze your audio and apply professional-grade
              processing to enhance tone, balance frequencies, optimize volume levels, and improve
              dynamics. This typically takes 1-2 minutes depending on file size.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
