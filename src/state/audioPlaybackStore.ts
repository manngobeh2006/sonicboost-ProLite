import { create } from 'zustand';
import { Audio } from 'expo-av';

interface AudioPlaybackState {
  currentSound: Audio.Sound | null;
  isPlaying: boolean;
  currentFileId: string | null;
  setSound: (sound: Audio.Sound | null, fileId: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  stopAndClearAudio: () => Promise<void>;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  currentSound: null,
  isPlaying: false,
  currentFileId: null,

  setSound: (sound, fileId) => {
    set({ currentSound: sound, currentFileId: fileId });
  },

  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
  },

  stopAndClearAudio: async () => {
    const { currentSound } = get();
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
    set({ currentSound: null, isPlaying: false, currentFileId: null });
  },
}));
