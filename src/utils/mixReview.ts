import { AudioAnalysis } from './audioProcessing';

/**
 * Mix Review System
 * Provides encouraging, constructive feedback on audio mixes
 * Focuses on areas SonicBoost can enhance
 */

export interface MixReviewResult {
  overallScore: number; // 0-100, always encouraging (60-95 range)
  strengths: string[]; // What's already good
  opportunities: string[]; // What can be enhanced (never "problems")
  recommendations: string[]; // Specific actions
  readyForMastering: boolean; // Always suggest enhancement
  encouragement: string; // Positive message
}

/**
 * Analyze mix and provide encouraging, actionable feedback
 * Focuses on what SonicBoost can improve
 */
export function analyzeMixQuality(analysis: AudioAnalysis): MixReviewResult {
  const strengths: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  // Calculate encouraging score (60-95 range - always room for improvement)
  let baseScore = 65;

  // Analyze Loudness
  if (analysis.energyLevel > 0.7) {
    strengths.push('Good energy and presence');
    baseScore += 5;
  } else {
    opportunities.push('Loudness can be optimized for streaming platforms');
    recommendations.push('Boost overall loudness for more impact');
  }

  // Analyze Frequency Balance
  if (analysis.bassLevel > 0.6 && analysis.bassLevel < 0.85) {
    strengths.push('Well-balanced low-end');
    baseScore += 5;
  } else if (analysis.bassLevel < 0.6) {
    opportunities.push('Low frequencies could use more warmth');
    recommendations.push('Enhance bass for fuller sound');
  } else {
    opportunities.push('Low-end could be better controlled');
    recommendations.push('Balance bass frequencies for clarity');
  }

  // Analyze Mid-Range (Vocals/Instruments)
  if (analysis.midLevel > 0.7) {
    strengths.push('Clear mid-range definition');
    baseScore += 5;
  } else {
    opportunities.push('Mid-range clarity can be enhanced');
    recommendations.push('Improve vocal/instrument presence');
  }

  // Analyze High Frequencies
  if (analysis.trebleLevel > 0.6 && analysis.trebleLevel < 0.85) {
    strengths.push('Nice high-frequency sparkle');
    baseScore += 5;
  } else if (analysis.trebleLevel < 0.6) {
    opportunities.push('High frequencies could be more vibrant');
    recommendations.push('Add brightness for professional shine');
  } else {
    opportunities.push('Treble can be smoothed for comfort');
    recommendations.push('Refine high frequencies for polish');
  }

  // Genre-specific feedback
  if (analysis.genre !== 'unknown') {
    strengths.push(`Genre characteristics detected (${analysis.genre})`);
    baseScore += 5;
  }

  // Ensure we always have at least 2 strengths
  if (strengths.length < 2) {
    strengths.push('Solid foundation to build upon');
    strengths.push('Ready for professional enhancement');
  }

  // Ensure we have enhancement opportunities
  if (opportunities.length === 0) {
    opportunities.push('Can be optimized for maximum impact');
    opportunities.push('Ready for final polish and refinement');
  }

  // Cap score at 85 (always room for enhancement)
  const finalScore = Math.min(85, baseScore);

  // Generate encouraging message based on score
  let encouragement = '';
  if (finalScore >= 80) {
    encouragement = "Excellent starting point! Let's add that final professional polish.";
  } else if (finalScore >= 70) {
    encouragement = "Great work! A few enhancements will take this to the next level.";
  } else {
    encouragement = "Good foundation! Some sonic optimization will really make this shine.";
  }

  return {
    overallScore: finalScore,
    strengths,
    opportunities,
    recommendations,
    readyForMastering: true, // Always encourage enhancement
    encouragement,
  };
}

/**
 * Generate detailed review description
 */
export function generateReviewSummary(review: MixReviewResult): string {
  return `Your mix shows ${review.strengths.length} strong points and has ${review.opportunities.length} areas ready for optimization. ${review.encouragement}`;
}

/**
 * Get score color (always positive colors)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 70) return 'text-blue-400';
  return 'text-purple-400';
}

/**
 * Get score grade (always B or higher - encouraging)
 */
export function getScoreGrade(score: number): string {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  return 'B';
}

/**
 * Get encouraging score description
 */
export function getScoreDescription(score: number): string {
  if (score >= 80) return 'Excellent Mix Quality';
  if (score >= 70) return 'Very Good Mix Quality';
  return 'Good Mix Quality';
}
