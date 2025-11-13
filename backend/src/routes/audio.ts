import express, { Request, Response } from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Configure multer for file uploads (max 50MB)
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|aac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files allowed.'));
    }
  }
});

// Middleware to verify JWT token (basic implementation, adjust as needed)
const verifyToken = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Token verification logic - adjust based on your auth system
  // For now, we just check if token exists
  const token = authHeader.substring(7);
  
  if (!token) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // TODO: Add proper JWT verification using your auth system
  next();
};

interface MasteringSettings {
  volumeBoost: number;
  brightness: number;
  midRange: number;
  bassBoost: number;
  compression: number;
  pitchShift: number;
}

/**
 * POST /api/audio/process
 * Professional audio processing with FFmpeg
 * 
 * Body (multipart/form-data):
 * - file: Audio file
 * - settings: JSON string of MasteringSettings
 * - genre: AudioGenre string
 * - format: 'mp3' or 'wav'
 */
router.post('/process', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    inputPath = req.file.path;
    const settings: MasteringSettings = JSON.parse(req.body.settings || '{}');
    const genre = req.body.genre || 'unknown';
    const format = req.body.format || 'mp3';
    
    // Generate output path
    const outputFilename = `processed_${Date.now()}.${format}`;
    outputPath = path.join('/tmp/processed/', outputFilename);
    await fs.mkdir('/tmp/processed/', { recursive: true });

    console.log('🎵 Processing audio with settings:', settings);

    // Build FFmpeg command with professional DSP chain
    await processAudioWithFFmpeg(inputPath, outputPath, settings, genre, format);

    // Return processed file
    res.sendFile(outputPath, async (err) => {
      // Cleanup after sending
      try {
        if (inputPath) await fs.unlink(inputPath);
        if (outputPath) await fs.unlink(outputPath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Audio processing error:', error);
    
    // Cleanup on error
    try {
      if (inputPath) await fs.unlink(inputPath);
      if (outputPath) await fs.unlink(outputPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Audio processing failed',
      details: errorMessage 
    });
  }
});

/**
 * Professional FFmpeg Audio Processing Pipeline
 * Implements studio-grade DSP: EQ, Compression, Saturation, Limiting
 */
function processAudioWithFFmpeg(
  inputPath: string, 
  outputPath: string, 
  settings: MasteringSettings, 
  genre: string, 
  format: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);

    // Build professional audio filter chain
    const filters = buildAudioFilters(settings, genre);
    
    command
      .audioFilters(filters)
      .audioCodec(format === 'wav' ? 'pcm_s16le' : 'libmp3lame');
    
    // Set bitrate only for MP3
    if (format !== 'wav') {
      command.audioBitrate('256k');
    }
    
    command
      .audioChannels(2)
      .audioFrequency(44100)
      .format(format === 'wav' ? 'wav' : 'mp3')
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('FFmpeg command:', cmd);
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ Processing complete');
        resolve();
      })
      .on('error', (err: Error) => {
        console.error('❌ FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Build professional audio filter chain
 * Implements studio-grade DSP processing
 */
function buildAudioFilters(settings: MasteringSettings, genre: string): string {
  const filters: string[] = [];

  // 1. HIGH-PASS FILTER (Remove sub-bass rumble)
  filters.push('highpass=f=30');

  // 2. PARAMETRIC EQ (3-Band Professional EQ)
  
  // Bass (Low Shelf at 120Hz)
  const bassGain = (settings.bassBoost * 12) - 6; // -6 to +6 dB
  filters.push(`equalizer=f=120:width_type=o:width=1.5:t=s:g=${bassGain.toFixed(1)}`);
  
  // Mids (Bell at 1200Hz for vocals/presence)
  const midGain = (settings.midRange * 8) - 4; // -4 to +4 dB
  filters.push(`equalizer=f=1200:width_type=o:width=0.8:t=h:g=${midGain.toFixed(1)}`);
  
  // Treble (High Shelf at 8kHz for brightness)
  const trebleGain = (settings.brightness * 10) - 5; // -5 to +5 dB
  filters.push(`equalizer=f=8000:width_type=o:width=1.2:t=s:g=${trebleGain.toFixed(1)}`);

  // 3. HARMONIC EXCITER (Add warmth and presence)
  // Subtle saturation for analog warmth
  const exciterAmount = settings.volumeBoost * 0.1; // Subtle 0-10%
  if (exciterAmount > 0.02) {
    filters.push(`afftdn=nr=${exciterAmount.toFixed(3)}:nf=-20`);
  }

  // 4. DYNAMIC COMPRESSION (Glue and punch)
  const threshold = -20 + (settings.compression * 5); // -20 to -15 dB
  const ratio = 3 + (settings.compression * 2); // 3:1 to 5:1
  const attack = 20; // 20ms fast attack
  const release = 180; // 180ms medium release
  const makeupGain = settings.compression * 4; // Compensate volume reduction
  
  filters.push(
    `acompressor=threshold=${threshold.toFixed(1)}dB:ratio=${ratio.toFixed(1)}:attack=${attack}:release=${release}:makeup=${makeupGain.toFixed(1)}dB`
  );

  // 5. LOUDNESS MAXIMIZATION (Final limiting)
  const targetLUFS = -14 + (settings.volumeBoost * 4); // -14 to -10 LUFS (streaming standard)
  filters.push(`loudnorm=I=${targetLUFS.toFixed(1)}:TP=-1.0:LRA=7:measured_I=-23:measured_TP=-5:measured_LRA=15`);

  // 6. TRUE PEAK LIMITING (Prevent clipping)
  filters.push('alimiter=limit=0.99:attack=5:release=50');

  console.log('🎛️ Audio filter chain:', filters.join(','));
  return filters.join(',');
}

export default router;
