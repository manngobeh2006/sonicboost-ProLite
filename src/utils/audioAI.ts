/**
 * AI-Powered Audio Analysis Utilities
 * Uses GPT-MINI to provide intelligent audio analysis and natural language control
 */

import { getGPTMiniTextResponse } from '../api/chat-service';
import { AudioAnalysis, MasteringSettings } from './audioProcessing';

export interface AudioCommand {
  type: 'frequency_boost' | 'frequency_cut' | 'volume' | 'brightness' | 'bass' | 'compression' | 'unknown';
  frequency?: number; // Hz
  db?: number; // dB adjustment
  value?: number; // 0-1 for other adjustments
  description: string;
}

/**
 * Parse natural language audio commands
 * Example: "increase frequency band at 1 db at 2000 Hz"
 */
export const parseAudioCommand = async (command: string): Promise<AudioCommand> => {
  try {
    const prompt = `You are an audio engineering assistant. Parse this audio command into structured data.

Command: "${command}"

Respond with ONLY a JSON object (no markdown, no explanation) with this structure:
{
  "type": "frequency_boost" | "frequency_cut" | "volume" | "brightness" | "bass" | "compression" | "unknown",
  "frequency": number (in Hz, if applicable),
  "db": number (dB change, if applicable),
  "value": number (0-1 for percentage adjustments),
  "description": "user-friendly description of what will be done"
}

Examples:
- "increase 2khz by 3db" → {"type":"frequency_boost","frequency":2000,"db":3,"description":"Boost 2kHz by +3dB"}
- "cut low end" → {"type":"frequency_cut","frequency":100,"db":-2,"description":"Cut low frequencies around 100Hz"}
- "boost bass" → {"type":"bass","value":0.7,"description":"Increase bass levels"}
- "more brightness" → {"type":"brightness","value":0.8,"description":"Add more high-frequency sparkle"}`;

    const response = await getGPTMiniTextResponse([
      { role: 'system', content: 'You are an audio engineering parser. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 300 });

    // Validate response content exists
    if (!response.content || response.content.trim() === '') {
      console.log('AI response empty for audio command parsing');
      return {
        type: 'unknown',
        description: 'Could not understand the command. Try being more specific like "boost 2kHz by 3dB"',
      };
    }

    // Clean the response and parse JSON
    let cleanedContent = response.content.trim();

    // Remove markdown code blocks if present
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Additional validation before parsing
    if (!cleanedContent || cleanedContent === '') {
      console.log('AI response empty after cleaning for audio command parsing');
      return {
        type: 'unknown',
        description: 'Could not understand the command. Try being more specific like "boost 2kHz by 3dB"',
      };
    }

    const parsed = JSON.parse(cleanedContent);
    return parsed;
  } catch (error) {
    console.log('Using default audio command response');
    return {
      type: 'unknown',
      description: 'Could not understand the command. Try being more specific like "boost 2kHz by 3dB"',
    };
  }
};

/**
 * Apply audio command to mastering settings
 */
export const applyAudioCommand = (
  settings: MasteringSettings,
  command: AudioCommand
): MasteringSettings => {
  const newSettings = { ...settings };

  switch (command.type) {
    case 'frequency_boost':
      // For frequency-specific boosts, adjust brightness or bass based on frequency
      if (command.frequency && command.frequency > 5000) {
        newSettings.brightness = Math.min(1, newSettings.brightness + 0.15);
      } else if (command.frequency && command.frequency < 250) {
        newSettings.bassBoost = Math.min(1, newSettings.bassBoost + 0.15);
      } else {
        newSettings.midRange = Math.min(1, newSettings.midRange + 0.15);
      }
      break;

    case 'frequency_cut':
      if (command.frequency && command.frequency > 5000) {
        newSettings.brightness = Math.max(0, newSettings.brightness - 0.15);
      } else if (command.frequency && command.frequency < 250) {
        newSettings.bassBoost = Math.max(0, newSettings.bassBoost - 0.15);
      } else {
        newSettings.midRange = Math.max(0, newSettings.midRange - 0.15);
      }
      break;

    case 'bass':
      if (command.value !== undefined) {
        newSettings.bassBoost = Math.min(1, Math.max(0, command.value));
      }
      break;

    case 'brightness':
      if (command.value !== undefined) {
        newSettings.brightness = Math.min(1, Math.max(0, command.value));
      }
      break;

    case 'volume':
      if (command.value !== undefined) {
        newSettings.volumeBoost = Math.min(1, Math.max(0, command.value));
      }
      break;

    case 'compression':
      if (command.value !== undefined) {
        newSettings.compression = Math.min(1, Math.max(0, command.value));
      }
      break;
  }

  return newSettings;
};

/**
 * Generate smart audio analysis description
 */
export const generateAudioAnalysisDescription = async (
  analysis: AudioAnalysis
): Promise<string> => {
  try {
    const prompt = `You are an expert audio engineer analyzing a track. Based on this analysis, provide a brief, professional description (2-3 sentences) of the audio characteristics:

Genre: ${analysis.genre}
Tempo: ${analysis.tempo} BPM
Has Vocals: ${analysis.hasVocals ? 'Yes' : 'No'}
Energy Level: ${(analysis.energyLevel * 100).toFixed(0)}%
Bass Content: ${(analysis.bassLevel * 100).toFixed(0)}%
Mid-Range Content: ${(analysis.midLevel * 100).toFixed(0)}%
High Frequencies: ${(analysis.trebleLevel * 100).toFixed(0)}%

Describe what this tells you about the track in a friendly, informative way.`;

    const response = await getGPTMiniTextResponse([
      { role: 'system', content: 'You are a professional audio engineer providing friendly analysis.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 200 });

    if (!response.content || response.content.trim() === '') {
      console.log('AI response empty, using default analysis description');
      return `This ${analysis.genre} track has a tempo of ${analysis.tempo} BPM with ${analysis.hasVocals ? 'vocals' : 'instrumental elements'}.`;
    }

    return response.content.trim();
  } catch (error) {
    console.log('Using default analysis description');
    return `This ${analysis.genre} track has a tempo of ${analysis.tempo} BPM with ${analysis.hasVocals ? 'vocals' : 'instrumental elements'}.`;
  }
};

/**
 * Generate personalized mixing tips based on audio analysis
 */
export const generateMixingTips = async (
  analysis: AudioAnalysis,
  isMastering: boolean = false
): Promise<string[]> => {
  try {
    const stage = isMastering ? 'mastering' : 'mixing';
    const prompt = `You are an expert audio engineer. Based on this audio analysis, provide 3-4 specific, actionable tips for ${stage}:

Genre: ${analysis.genre}
Tempo: ${analysis.tempo} BPM
Has Vocals: ${analysis.hasVocals ? 'Yes' : 'No'}
Energy Level: ${(analysis.energyLevel * 100).toFixed(0)}%
Bass Content: ${(analysis.bassLevel * 100).toFixed(0)}%
Mid-Range Content: ${(analysis.midLevel * 100).toFixed(0)}%
High Frequencies: ${(analysis.trebleLevel * 100).toFixed(0)}%

Provide tips as a JSON array of strings. Each tip should be one sentence, practical and specific to this track's characteristics.
Format: ["tip 1", "tip 2", "tip 3", "tip 4"]

Focus on: EQ balance, dynamics, spatial positioning, and genre-specific techniques.`;

    const response = await getGPTMiniTextResponse([
      { role: 'system', content: 'You are an expert audio engineer. Return only a JSON array of strings.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 500 });

    // Validate response content exists
    if (!response.content || response.content.trim() === '') {
      console.log('AI response empty, using default mixing tips');
      return getDefaultMixingTips(analysis, isMastering);
    }

    // Clean and parse response
    let cleanedContent = response.content.trim();
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Additional validation before parsing
    if (!cleanedContent || cleanedContent === '') {
      console.log('AI response empty after cleaning, using default mixing tips');
      return getDefaultMixingTips(analysis, isMastering);
    }

    const tips = JSON.parse(cleanedContent);

    if (Array.isArray(tips) && tips.length > 0) {
      return tips;
    }

    return getDefaultMixingTips(analysis, isMastering);
  } catch (error) {
    // Silently fall back to default tips - this is expected behavior
    console.log('Using default mixing tips');
    return getDefaultMixingTips(analysis, isMastering);
  }
};

/**
 * Fallback mixing tips if AI fails
 */
const getDefaultMixingTips = (analysis: AudioAnalysis, isMastering: boolean): string[] => {
  const tips: string[] = [];

  if (analysis.hasVocals) {
    tips.push('Keep vocals clear by preserving the 1-4kHz mid-range frequencies.');
  }

  if (analysis.bassLevel > 0.7) {
    tips.push('Monitor low-end carefully - use a high-pass filter to remove sub-20Hz rumble.');
  } else if (analysis.bassLevel < 0.4) {
    tips.push('Consider adding warmth with subtle bass enhancement around 80-150Hz.');
  }

  if (analysis.energyLevel > 0.7) {
    tips.push('Use compression carefully to control dynamics without losing the track\'s energy.');
  }

  if (isMastering) {
    tips.push('Apply gentle multiband compression for balanced frequency response across the spectrum.');
  } else {
    tips.push('Before mastering, ensure your mix has proper headroom (-6dB to -3dB peak levels).');
  }

  return tips;
};

/**
 * Generate preparation tips for mastering
 */
export const generatePreMasteringTips = async (analysis: AudioAnalysis): Promise<string[]> => {
  try {
    const prompt = `You are an expert mixing engineer preparing a track for mastering. Based on this analysis, provide 3-4 essential preparation tips:

Genre: ${analysis.genre}
Tempo: ${analysis.tempo} BPM
Has Vocals: ${analysis.hasVocals ? 'Yes' : 'No'}
Energy: ${(analysis.energyLevel * 100).toFixed(0)}%
Bass: ${(analysis.bassLevel * 100).toFixed(0)}%
Mids: ${(analysis.midLevel * 100).toFixed(0)}%
Highs: ${(analysis.trebleLevel * 100).toFixed(0)}%

Focus on:
- Headroom requirements
- Frequency balance
- Dynamic range considerations
- Common mistakes to avoid for this genre

Return only a JSON array of strings: ["tip 1", "tip 2", "tip 3", "tip 4"]`;

    const response = await getGPTMiniTextResponse([
      { role: 'system', content: 'You are an expert mixing engineer. Return only a JSON array.' },
      { role: 'user', content: prompt },
    ], { maxTokens: 500 });

    // Validate response content exists
    if (!response.content || response.content.trim() === '') {
      console.log('AI response empty, using default pre-mastering tips');
      return [
        'Leave at least -6dB of headroom in your mix before mastering.',
        'Check your mix in mono to ensure proper phase relationships.',
        'Remove any unnecessary low-frequency rumble below 30Hz.',
        'Ensure your mix has consistent volume levels throughout the track.',
      ];
    }

    let cleanedContent = response.content.trim();
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Additional validation before parsing
    if (!cleanedContent || cleanedContent === '') {
      console.log('AI response empty after cleaning, using default pre-mastering tips');
      return [
        'Leave at least -6dB of headroom in your mix before mastering.',
        'Check your mix in mono to ensure proper phase relationships.',
        'Remove any unnecessary low-frequency rumble below 30Hz.',
        'Ensure your mix has consistent volume levels throughout the track.',
      ];
    }

    const tips = JSON.parse(cleanedContent);

    if (Array.isArray(tips) && tips.length > 0) {
      return tips;
    }

    return [
      'Leave at least -6dB of headroom in your mix before mastering.',
      'Check your mix in mono to ensure proper phase relationships.',
      'Remove any unnecessary low-frequency rumble below 30Hz.',
      'Ensure your mix has consistent volume levels throughout the track.',
    ];
  } catch (error) {
    // Silently fall back to default tips
    console.log('Using default pre-mastering tips');
    return [
      'Leave at least -6dB of headroom in your mix before mastering.',
      'Check your mix in mono to ensure proper phase relationships.',
      'Remove any unnecessary low-frequency rumble below 30Hz.',
      'Ensure your mix has consistent volume levels throughout the track.',
    ];
  }
};
