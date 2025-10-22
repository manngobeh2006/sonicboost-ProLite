import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AudioFile {
  id: string;
  userId: string;
  originalFileName: string;
  originalUri: string;
  masteredUri?: string;
  masteredMp3Uri?: string;
  masteredWavUri?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  duration?: number; // in seconds
  fileSize?: number; // in bytes
  createdAt: string;
  completedAt?: string;
  error?: string;
  // Audio analysis data
  genre?: string;
  tempo?: number;
  masteringSettings?: any; // Store the mastering settings used
}

interface AudioState {
  files: AudioFile[];
  currentFile: AudioFile | null;
  addFile: (file: Omit<AudioFile, 'id' | 'createdAt'>) => AudioFile;
  updateFile: (id: string, updates: Partial<AudioFile>) => void;
  setCurrentFile: (file: AudioFile | null) => void;
  getFilesByUserId: (userId: string) => AudioFile[];
  deleteFile: (id: string) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      files: [],
      currentFile: null,

      addFile: (file) => {
        const newFile: AudioFile = {
          ...file,
          id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          files: [newFile, ...state.files],
          currentFile: newFile,
        }));

        return newFile;
      },

      updateFile: (id, updates) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, ...updates } : file
          ),
          currentFile:
            state.currentFile?.id === id
              ? { ...state.currentFile, ...updates }
              : state.currentFile,
        }));
      },

      setCurrentFile: (file) => {
        set({ currentFile: file });
      },

      getFilesByUserId: (userId) => {
        return get().files.filter((file) => file.userId === userId);
      },

      deleteFile: (id) => {
        set((state) => ({
          files: state.files.filter((file) => file.id !== id),
          currentFile: state.currentFile?.id === id ? null : state.currentFile,
        }));
      },
    }),
    {
      name: 'audio-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
