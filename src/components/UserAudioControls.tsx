import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

export interface UserAudioAdjustments {
  high: number;    // Treble/Brightness: -6 to +6 dB
  mid: number;     // Vocals/Presence: -6 to +6 dB
  low: number;     // Bass: -6 to +6 dB
  tempo: number;   // Pitch shift: -12 to +12 semitones
}

interface UserAudioControlsProps {
  adjustments: UserAudioAdjustments;
  onAdjustmentsChange: (adjustments: UserAudioAdjustments) => void;
  onReprocess: () => void;
  isProcessing: boolean;
}

export const INITIAL_ADJUSTMENTS: UserAudioAdjustments = {
  high: 0,
  mid: 0,
  low: 0,
  tempo: 0,
};

export default function UserAudioControls({
  adjustments,
  onAdjustmentsChange,
  onReprocess,
  isProcessing,
}: UserAudioControlsProps) {
  const updateAdjustment = (key: keyof UserAudioAdjustments, value: number) => {
    onAdjustmentsChange({
      ...adjustments,
      [key]: value,
    });
  };

  const resetAdjustments = () => {
    onAdjustmentsChange(INITIAL_ADJUSTMENTS);
  };

  const hasChanges = 
    adjustments.high !== 0 || 
    adjustments.mid !== 0 || 
    adjustments.low !== 0 || 
    adjustments.tempo !== 0;

  return (
    <View className="mx-6 mb-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-purple-600 rounded-full items-center justify-center mr-2">
            <Ionicons name="options" size={18} color="white" />
          </View>
          <Text className="text-white text-lg font-semibold">Manual Controls</Text>
        </View>
        <View className="bg-purple-600 px-3 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">UNLIMITED</Text>
        </View>
      </View>

      {/* Controls Card */}
      <View className="bg-gray-900 rounded-3xl p-5 border border-purple-600/30">
        {/* High (Treble/Brightness) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="flash" size={18} color="#A78BFA" />
              <Text className="text-white text-sm font-semibold ml-2">HIGH (Brightness)</Text>
            </View>
            <Text className="text-purple-400 text-sm font-bold">
              {adjustments.high > 0 ? '+' : ''}{adjustments.high.toFixed(1)} dB
            </Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={-6}
            maximumValue={6}
            step={0.5}
            value={adjustments.high}
            onValueChange={(value) => updateAdjustment('high', value)}
            minimumTrackTintColor="#9333EA"
            maximumTrackTintColor="#374151"
            thumbTintColor="#9333EA"
            disabled={isProcessing}
          />
          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-xs">Less</Text>
            <Text className="text-gray-500 text-xs">More</Text>
          </View>
        </View>

        {/* Mid (Vocals/Presence) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="mic" size={18} color="#A78BFA" />
              <Text className="text-white text-sm font-semibold ml-2">MID (Vocals)</Text>
            </View>
            <Text className="text-purple-400 text-sm font-bold">
              {adjustments.mid > 0 ? '+' : ''}{adjustments.mid.toFixed(1)} dB
            </Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={-6}
            maximumValue={6}
            step={0.5}
            value={adjustments.mid}
            onValueChange={(value) => updateAdjustment('mid', value)}
            minimumTrackTintColor="#9333EA"
            maximumTrackTintColor="#374151"
            thumbTintColor="#9333EA"
            disabled={isProcessing}
          />
          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-xs">Less</Text>
            <Text className="text-gray-500 text-xs">More</Text>
          </View>
        </View>

        {/* Low (Bass) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="musical-note" size={18} color="#A78BFA" />
              <Text className="text-white text-sm font-semibold ml-2">LOW (Bass)</Text>
            </View>
            <Text className="text-purple-400 text-sm font-bold">
              {adjustments.low > 0 ? '+' : ''}{adjustments.low.toFixed(1)} dB
            </Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={-6}
            maximumValue={6}
            step={0.5}
            value={adjustments.low}
            onValueChange={(value) => updateAdjustment('low', value)}
            minimumTrackTintColor="#9333EA"
            maximumTrackTintColor="#374151"
            thumbTintColor="#9333EA"
            disabled={isProcessing}
          />
          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-xs">Less</Text>
            <Text className="text-gray-500 text-xs">More</Text>
          </View>
        </View>

        {/* Tempo (Pitch Shift) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="speedometer" size={18} color="#A78BFA" />
              <Text className="text-white text-sm font-semibold ml-2">TEMPO</Text>
            </View>
            <Text className="text-purple-400 text-sm font-bold">
              {adjustments.tempo > 0 ? '+' : ''}{adjustments.tempo.toFixed(1)} semitones
            </Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={-12}
            maximumValue={12}
            step={1}
            value={adjustments.tempo}
            onValueChange={(value) => updateAdjustment('tempo', value)}
            minimumTrackTintColor="#9333EA"
            maximumTrackTintColor="#374151"
            thumbTintColor="#9333EA"
            disabled={isProcessing}
          />
          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-xs">Slower</Text>
            <Text className="text-gray-500 text-xs">Faster</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row space-x-3">
          {/* Reset Button */}
          <Pressable
            onPress={resetAdjustments}
            disabled={!hasChanges || isProcessing}
            className={`flex-1 py-3 rounded-2xl border-2 items-center ${
              hasChanges && !isProcessing
                ? 'bg-gray-800 border-gray-600'
                : 'bg-gray-900 border-gray-800 opacity-50'
            }`}
          >
            <Text className={`text-sm font-semibold ${
              hasChanges && !isProcessing ? 'text-white' : 'text-gray-600'
            }`}>
              Reset
            </Text>
          </Pressable>

          {/* Reprocess Button */}
          <Pressable
            onPress={onReprocess}
            disabled={!hasChanges || isProcessing}
            className={`flex-1 py-3 rounded-2xl items-center ${
              hasChanges && !isProcessing
                ? 'bg-purple-600'
                : 'bg-gray-800 opacity-50'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons 
                name={isProcessing ? "hourglass" : "refresh"} 
                size={16} 
                color="white" 
              />
              <Text className="text-white text-sm font-bold ml-2">
                {isProcessing ? 'Processing...' : 'Apply Changes'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Help Text */}
        <View className="mt-4 bg-purple-600/10 rounded-2xl p-3">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={16} color="#9333EA" />
            <Text className="text-purple-300 text-xs ml-2 flex-1 leading-5">
              Fine-tune your audio after AI processing. Adjustments are relative to the AI-enhanced version.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
