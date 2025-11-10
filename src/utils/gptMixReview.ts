import { AudioAnalysis } from './audioProcessing';
import { getOpenAIClient } from '../api/openai';
import { MixReviewResult } from './mixReview';

/**
 * Generate personalized mix review using GPT
 * Falls back to basic analysis if GPT fails
 */
export async function generateGPTMixReview(
  analysis: AudioAnalysis,
  fileName: string
): Promise<MixReviewResult> {
  try {
    const openai = getOpenAIClient();

    // Build detailed audio profile for GPT
    const audioProfile = `
Audio File: ${fileName}
Duration: ${analysis.duration.toFixed(1)}s
Tempo: ${analysis.tempo} BPM
Genre: ${analysis.genre === 'unknown' ? 'Not detected' : analysis.genre}

Technical Analysis:
- Energy Level: ${(analysis.energyLevel * 100).toFixed(0)}% (how energetic/loud)
- Bass Level: ${(analysis.bassLevel * 100).toFixed(0)}% (low frequencies)
- Mid-Range Level: ${(analysis.midLevel * 100).toFixed(0)}% (vocals/instruments)
- Treble Level: ${(analysis.trebleLevel * 100).toFixed(0)}% (high frequencies/brightness)
- Has Vocals: ${analysis.hasVocals ? 'Yes' : 'No'}
`;

    const prompt = `You are a professional audio engineer reviewing a music mix. Analyze this audio data and provide encouraging, constructive feedback.

${audioProfile}

Provide a JSON response with this EXACT structure (no markdown, no extra text):
{
  "overallScore": <number 65-85>,
  "strengths": [<2-3 specific positive observations>],
  "opportunities": [<2-3 areas that can be enhanced, positively framed>],
  "recommendations": [<2-3 specific actionable suggestions>],
  "encouragement": "<one encouraging sentence about the mix>"
}

Guidelines:
- Score between 65-85 (always room for improvement)
- Be specific and technical, but encouraging
- Focus on what SonicBoost can enhance (loudness, bass, mids, treble, brightness)
- Never say "bad" or "poor" - use positive language like "can be optimized" or "has potential"
- Make it personal to THIS specific audio file's characteristics
- Keep encouragement professional and motivating`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional audio engineer who provides encouraging, technical feedback on music mixes. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty GPT response');
    }

    // Parse JSON response
    const result = JSON.parse(content);

    // Validate structure
    if (!result.overallScore || !result.strengths || !result.opportunities || !result.recommendations || !result.encouragement) {
      throw new Error('Invalid GPT response structure');
    }

    return {
      overallScore: Math.max(65, Math.min(85, result.overallScore)),
      strengths: result.strengths,
      opportunities: result.opportunities,
      recommendations: result.recommendations,
      readyForMastering: true,
      encouragement: result.encouragement,
    };

  } catch (error) {
    console.error('GPT review failed, using fallback:', error);
    // Return null to trigger fallback to basic review
    throw error;
  }
}
