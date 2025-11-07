import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlaybackStore } from '../state/audioPlaybackStore';
import { useAudioStore } from '../state/audioStore';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MiniPlayer() {
  const navigation = useNavigation<NavigationProp>();
  const { currentSound, isPlaying, currentFileId, setIsPlaying, stopAndClearAudio } = useAudioPlaybackStore();
  const { files } = useAudioStore();
  const [slideAnim] = useState(new Animated.Value(100)); // Start offscreen

  const currentFile = files.find(f => f.id === currentFileId);

  // Animate in/out based on whether audio is loaded
  useEffect(() => {
    if (currentSound && currentFileId) {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Slide down
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [currentSound, currentFileId]);

  const togglePlayPause = async () => {
    if (!currentSound) return;

    try {
      if (isPlaying) {
        await currentSound.pauseAsync();
      } else {
        await currentSound.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      if (__DEV__) {
        console.warn('Mini-player playback error:', error);
      }
    }
  };

  const handleStop = async () => {
    await stopAndClearAudio();
  };

  const handleTapBar = () => {
    if (currentFileId) {
      navigation.navigate('Results', { fileId: currentFileId });
    }
  };

  // Don't render if no audio is loaded
  if (!currentSound || !currentFileId || !currentFile) {
    return null;
  }

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={handleTapBar}
        className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex-row items-center active:opacity-90"
      >
        {/* Audio Icon */}
        <View className="w-10 h-10 bg-purple-600 rounded-lg items-center justify-center mr-3">
          <Ionicons name="musical-notes" size={20} color="white" />
        </View>

        {/* File Info */}
        <View className="flex-1 mr-3">
          <Text className="text-white text-sm font-semibold" numberOfLines={1}>
            {currentFile.originalFileName}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            Tap to view full player
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center space-x-2">
          <Pressable
            onPress={togglePlayPause}
            className="w-10 h-10 items-center justify-center active:opacity-70"
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="white"
            />
          </Pressable>

          <Pressable
            onPress={handleStop}
            className="w-10 h-10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}
