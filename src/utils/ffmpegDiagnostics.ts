/**
 * FFmpeg Diagnostics Utility
 * Helps debug FFmpeg issues on device
 */

import { FFmpegKit, ReturnCode } from 'expo-ffmpeg-kit';
import * as FileSystem from 'expo-file-system/legacy';

export interface DiagnosticResult {
  available: boolean;
  version?: string;
  error?: string;
  testPassed?: boolean;
}

/**
 * Run comprehensive FFmpeg diagnostics
 */
export async function runFFmpegDiagnostics(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    available: false,
  };

  try {
    // Test 1: Check if FFmpeg is available
    console.log('🔍 Testing FFmpeg availability...');
    const versionSession = await FFmpegKit.execute('-version');
    const versionCode = await versionSession.getReturnCode();
    
    if (!ReturnCode.isSuccess(versionCode)) {
      result.error = 'FFmpeg not available';
      console.error('❌ FFmpeg not available');
      return result;
    }

    result.available = true;
    const versionOutput = await versionSession.getOutput();
    result.version = versionOutput?.split('\n')[0] || 'Unknown';
    console.log('✅ FFmpeg available:', result.version);

    // Test 2: Create a simple test file
    console.log('🔍 Testing FFmpeg processing...');
    const testDir = `${FileSystem.documentDirectory}ffmpeg_test/`;
    await FileSystem.makeDirectoryAsync(testDir, { intermediates: true });

    // Create a simple sine wave test (1 second, 440Hz)
    const testOutput = `${testDir}test.mp3`;
    const testCommand = `-f lavfi -i \"sine=frequency=440:duration=1\" -ar 44100 -ab 128k \"${testOutput}\"`;
    
    console.log('🔧 Test command:', testCommand);
    const testSession = await FFmpegKit.execute(testCommand);
    const testCode = await testSession.getReturnCode();

    if (ReturnCode.isSuccess(testCode)) {
      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(testOutput);
      if (fileInfo.exists) {
        result.testPassed = true;
        console.log('✅ FFmpeg test passed');
        
        // Cleanup
        await FileSystem.deleteAsync(testDir, { idempotent: true });
      } else {
        result.testPassed = false;
        result.error = 'Test file not created';
        console.error('❌ Test file not created');
      }
    } else {
      result.testPassed = false;
      const testOutput = await testSession.getOutput();
      result.error = `Test failed: ${testOutput?.substring(0, 100)}`;
      console.error('❌ FFmpeg test failed:', testOutput);
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Diagnostic error:', error);
    return result;
  }
}

/**
 * Get simple diagnostic info as string
 */
export async function getFFmpegInfo(): Promise<string> {
  const diagnostic = await runFFmpegDiagnostics();
  
  let info = '📊 FFmpeg Diagnostics:\n\n';
  info += `Available: ${diagnostic.available ? '✅ Yes' : '❌ No'}\n`;
  
  if (diagnostic.version) {
    info += `Version: ${diagnostic.version}\n`;
  }
  
  if (diagnostic.testPassed !== undefined) {
    info += `Processing Test: ${diagnostic.testPassed ? '✅ Passed' : '❌ Failed'}\n`;
  }
  
  if (diagnostic.error) {
    info += `\nError: ${diagnostic.error}\n`;
  }
  
  return info;
}
