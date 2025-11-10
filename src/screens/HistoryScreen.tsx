import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { useAudioStore, AudioFile } from '../state/audioStore';
import { useAudioPlaybackStore } from '../state/audioPlaybackStore';
import { RootStackParamList } from '../navigation/types';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

export default function HistoryScreen() {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const { user } = useAuthStore();
  const { getFilesByUserId, deleteFile, files } = useAudioStore();
  const { stopAndClearAudio, currentFileId } = useAudioPlaybackStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-compute userFiles on every render to reflect deletions immediately
  const userFiles = user ? files.filter(f => f.userId === user.id) : [];
  const isPro = user?.subscriptionTier === 'pro' || user?.subscriptionStatus === 'pro';
  const isUnlimited = user?.subscriptionTier === 'unlimited' || user?.subscriptionStatus === 'unlimited';
  const hasPremium = isPro || isUnlimited; // Any paid plan

  // Check if user is on free plan and show upgrade screen
  if (!hasPremium) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-6 py-6 flex-row items-center">
          <Pressable 
            onPress={() => navigation.goBack()} 
            className="mr-4 w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-3xl font-bold">History</Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="w-32 h-32 bg-purple-600/20 rounded-full items-center justify-center mb-6">
            <Ionicons name="lock-closed" size={64} color="#9333EA" />
          </View>
          
          <Text className="text-white text-2xl font-bold mb-3 text-center">
            Download History
          </Text>
          
          <Text className="text-gray-400 text-base text-center mb-8 leading-6">
            Upgrade to Pro to access your download history and keep track of all your enhanced files.
          </Text>

          <View className="bg-gray-900 rounded-2xl p-5 mb-8 border border-gray-800 w-full">
            <Text className="text-white text-sm font-semibold mb-3">Pro features:</Text>
            {[
              'Access download history',
              'Unlimited enhancements',
              'WAV export',
              'Tempo analysis',
              'Reference song upload',
            ].map((feature, index) => (
              <View key={index} className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text className="text-gray-300 text-sm ml-3">{feature}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => navigation.navigate('Subscriptions')}
            className="bg-purple-600 rounded-2xl px-8 py-4 w-full items-center active:opacity-80 mb-3"
          >
            <Text className="text-white text-base font-semibold">View Plans</Text>
            <Text className="text-purple-200 text-xs mt-1">Starting at $11.99/mo</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            className="py-3"
          >
            <Text className="text-gray-400 text-sm">Maybe later</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFilePress = (file: AudioFile) => {
    if (file.status === 'completed') {
      navigation.navigate('Results', { fileId: file.id });
    } else if (file.status === 'processing' || file.status === 'uploaded') {
      navigation.navigate('Mastering', { fileId: file.id });
    }
  };

  const handleDelete = useCallback(async (fileId: string, fileName: string) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Stop audio if this file is currently playing
            if (currentFileId === fileId) {
              await stopAndClearAudio();
            }
            
            // Delete the file from store
            deleteFile(fileId);
            
            // Force re-render to show updated list
            setRefreshKey(prev => prev + 1);
          },
        },
      ]
    );
  }, [deleteFile, currentFileId, stopAndClearAudio]);

  const getStatusColor = (status: AudioFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'processing':
        return 'bg-purple-500/20 text-purple-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const renderFileItem = ({ item }: { item: AudioFile }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <Pressable
        onPress={() => handleFilePress(item)}
        className="bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-800 active:opacity-70"
      >
        <View className="flex-row items-start">
          <View
            className={`w-16 h-16 rounded-xl items-center justify-center mr-4 ${
              item.status === 'completed' ? 'bg-purple-600/20' : 'bg-gray-800'
            }`}
          >
            <Ionicons
              name={item.status === 'completed' ? 'musical-notes' : 'hourglass'}
              size={28}
              color={item.status === 'completed' ? '#9333EA' : '#6B7280'}
            />
          </View>

          <View className="flex-1">
            <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>
              {item.originalFileName}
            </Text>

            <View className="flex-row items-center mb-2">
              <Text className="text-gray-400 text-xs mr-3">{formatDuration(item.duration)}</Text>
              <Text className="text-gray-500 text-xs">•</Text>
              <Text className="text-gray-400 text-xs ml-3">{formatDate(item.createdAt)}</Text>
              {item.genre && (
                <>
                  <Text className="text-gray-500 text-xs ml-3">•</Text>
                  <Text className="text-purple-400 text-xs ml-3 capitalize">{item.genre}</Text>
                </>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <View className={`px-3 py-1 rounded-full ${statusColor.split(' ')[0]}`}>
                <Text className={`text-xs font-semibold ${statusColor.split(' ')[1]}`}>
                  {item.status.toUpperCase()}
                </Text>
              </View>

              {item.status === 'completed' && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id, item.originalFileName);
                  }}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header with Back Button */}
      <View className="px-6 py-6 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable 
            onPress={() => navigation.goBack()} 
            className="mr-4 w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text className="text-white text-3xl font-bold">History</Text>
        </View>
        <View className="bg-purple-600/20 px-3 py-1 rounded-full">
          <Text className="text-purple-400 text-sm font-semibold">{userFiles.length} files</Text>
        </View>
      </View>

      {userFiles.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-32 h-32 bg-gray-900 rounded-full items-center justify-center mb-6">
            <Ionicons name="folder-open-outline" size={64} color="#6B7280" />
          </View>
          <Text className="text-white text-xl font-bold mb-2">No files yet</Text>
          <Text className="text-gray-400 text-sm text-center mb-8">
            Upload your first audio file to get started with sonic enhancement
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Home')}
            className="bg-purple-600 rounded-2xl px-8 py-4 active:opacity-80"
          >
            <Text className="text-white text-base font-semibold">Upload Audio</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={userFiles}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.id}
          extraData={refreshKey}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
