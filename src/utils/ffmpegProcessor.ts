import { FFmpegKit, ReturnCode } from 'expo-ffmpeg-kit';
import * as FileSystem from 'expo-file-system/legacy';
import { MasteringSettings, AudioGenre } from './audioProcessing';

/**
 * Professional FFmpeg Audio Processor
 * Applies real DSP: EQ, compression, limiting, and loudness maximization
 */

interface ProcessingResult {
  success: boolean;
  outputPath: string;
  error?: string;
}

/**
 * Build FFmpeg filter chain based on mastering settings and genre
 */
function buildFilterChain(settings: MasteringSettings, genre: AudioGenre): string {
  const filters: string[] = [];

  // 1. EQ (Equalization) - Genre-adaptive frequency shaping
  const eqFilters: string[] = [];
  
  // Bass enhancement (120Hz low shelf)
  if (settings.bassBoost > 0.5) {
    const bassGain = Math.round((settings.bassBoost - 0.5) * 12); // 0-6 dB
    eqFilters.push(`equalizer=f=120:t=h:width=200:g=${bassGain}`);
  }
  
  // Mid-range presence (1200Hz bell) - Critical for vocals
  if (settings.midRange > 0.6) {
    const midGain = Math.round((settings.midRange - 0.5) * 8); // 0-4 dB
    eqFilters.push(`equalizer=f=1200:t=q:width=1.5:g=${midGain}`);
  }
  
  // High-end sparkle (8000Hz high shelf) - Brightness
  if (settings.brightness > 0.6) {
    const trebleGain = Math.round((settings.brightness - 0.5) * 10); // 0-5 dB
    eqFilters.push(`equalizer=f=8000:t=h:width=2000:g=${trebleGain}`);
  }
  
  // De-muddiness (300Hz cut for clarity) - Especially for bass-heavy genres
  if (genre === 'hiphop' || genre === 'electronic' || settings.bassBoost > 0.7) {
    eqFilters.push(`equalizer=f=300:t=q:width=1.2:g=-2`);
  }
  
  filters.push(...eqFilters);

  // 2. Compression - Dynamic range control
  // More aggressive for genres that need punch
  const threshold = genre === 'hiphop' || genre === 'electronic' ? '-20dB' : '-18dB';
  const ratio = settings.compression > 0.7 ? '4' : '3';
  const attack = genre === 'classical' || genre === 'jazz' ? '30' : '20'; // Preserve transients for organic genres
  const release = '180';
  const makeup = Math.round(settings.volumeBoost * 3); // 0-3 dB makeup gain
  
  filters.push(`acompressor=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release}:makeup=${makeup}`);

  // 3. Harmonic exciter (subtle saturation for warmth)
  // Adds odd harmonics without harsh distortion
  if (settings.bassBoost > 0.6 || settings.brightness > 0.7) {
    filters.push(`aexciter=level_in=1:level_out=1:amount=0.5:drive=3`);
  }

  // 4. Loudness maximization (limiter) - Final stage
  // True peak limiting to -1.0 dBTP for streaming platform compliance
  const loudnessTarget = -14 + Math.round(settings.volumeBoost * 4); // LUFS: -14 to -10
  filters.push(`loudnorm=i=${loudnessTarget}:lra=7:tp=-1.0`);

  return filters.join(',');
}

/**
 * Process audio file with FFmpeg DSP
 * Applies real EQ, compression, and loudness maximization
 */
export async function processAudioWithFFmpeg(
  inputPath: string,
  outputPath: string,
  settings: MasteringSettings,
  genre: AudioGenre
): Promise<ProcessingResult> {
  try {
    // Ensure output directory exists
    const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true });

    // Build professional filter chain
    const filterChain = buildFilterChain(settings, genre);

    // FFmpeg command: input → filters → output
    // -y: overwrite output
    // -i: input file
    // -af: audio filters
    // -ar 44100: sample rate (standard quality)
    // -ab 256k: bitrate for MP3 (high quality)
    const command = `-y -i ${inputPath} -af "${filterChain}" -ar 44100 -ab 256k ${outputPath}`;

    console.log('🎛️ FFmpeg processing:', {
      genre,
      settings: {
        volumeBoost: Math.round(settings.volumeBoost * 100) + '%',
        brightness: Math.round(settings.brightness * 100) + '%',
        midRange: Math.round(settings.midRange * 100) + '%',
        bassBoost: Math.round(settings.bassBoost * 100) + '%',
        compression: Math.round(settings.compression * 100) + '%',
      },
    });

    // Execute FFmpeg
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('✅ FFmpeg processing complete');
      return {
        success: true,
        outputPath,
      };
    } else {
      const output = await session.getOutput();
      console.error('❌ FFmpeg failed:', output);
      return {
        success: false,
        outputPath,
        error: 'Processing failed',
      };
    }
  } catch (error) {
    console.error('❌ FFmpeg error:', error);
    return {
      success: false,
      outputPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Estimate processing time based on file duration
 * FFmpeg typically processes 1-2x realtime on mobile
 */
export function estimateProcessingTime(durationSeconds: number): number {
  // Conservative estimate: 1.5x realtime (60s audio = 90s processing)
  return Math.ceil(durationSeconds * 1.5);
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    const session = await FFmpegKit.execute('-version');
    const returnCode = await session.getReturnCode();
    return ReturnCode.isSuccess(returnCode);
  } catch {
    return false;
  }
}
