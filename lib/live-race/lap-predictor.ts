// lib/live-race/lap-predictor.ts
// Smart lap time prediction algorithm for crew countdown

import type { LapTime } from "@/types/live-race";

export interface LapPredictionResult {
  predictedLapTime: number; // seconds
  confidence: number; // 0-1
  recentLaps: number[]; // lap times used for prediction
}

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate coefficient of variation (std dev / mean)
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);
  return mean > 0 ? stdDev / mean : 0;
}

/**
 * Calculate linear regression slope
 * Returns slope in seconds per lap (positive = slowing down)
 */
function linearRegressionSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i; // lap index
    const y = values[i]; // lap time
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

/**
 * Calculate weights for lap times using IQR-based outlier detection
 * Outliers get reduced weight instead of being removed
 * Returns array of weights (0.1 to 1.0) for each lap
 */
function calculateOutlierWeights(lapTimes: number[]): number[] {
  if (lapTimes.length < 3) {
    return lapTimes.map(() => 1.0);
  }

  // Calculate quartiles using median
  const sorted = [...lapTimes].sort((a, b) => a - b);
  const q1 = median(sorted.slice(0, Math.floor(sorted.length / 2)));
  const q3 = median(sorted.slice(Math.ceil(sorted.length / 2)));
  const iqr = q3 - q1;

  // Tukey's fences for mild and extreme outliers
  const mildOutlierThreshold = q3 + 1.5 * iqr;
  const extremeOutlierThreshold = q3 + 3.0 * iqr;

  return lapTimes.map((time) => {
    if (time > extremeOutlierThreshold) {
      // Extreme outlier: 10% weight (likely a long break)
      return 0.1;
    } else if (time > mildOutlierThreshold) {
      // Mild outlier: 30% weight (maybe a short break or slow lap)
      return 0.3;
    } else {
      // Normal lap: full weight
      return 1.0;
    }
  });
}

/**
 * Predict next lap time using weighted moving average with trend adjustment
 * @param laps - Array of recent lap data (should be sorted by lap number ascending)
 * @param maxLaps - Maximum number of laps to consider (default: 6)
 * @returns Prediction result with confidence score
 */
export function predictNextLapTime(
  laps: LapTime[],
  maxLaps: number = 6
): LapPredictionResult {
  // Handle insufficient data
  if (laps.length === 0) {
    return {
      predictedLapTime: 0,
      confidence: 0,
      recentLaps: [],
    };
  }

  if (laps.length === 1) {
    return {
      predictedLapTime: laps[0].lapTimeSec,
      confidence: 0.5,
      recentLaps: [laps[0].lapTimeSec],
    };
  }

  // Take last N laps
  const recentLaps = laps.slice(-maxLaps);
  const lapTimes = recentLaps.map((lap) => lap.lapTimeSec);

  // Calculate outlier weights (0.1-1.0) instead of removing outliers
  const outlierWeights = calculateOutlierWeights(lapTimes);

  // Recency weights (more recent = higher weight)
  const recencyWeights = lapTimes.map((_, index) => index + 1);

  // Combine outlier weights with recency weights
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < lapTimes.length; i++) {
    const combinedWeight = outlierWeights[i] * recencyWeights[i];
    weightedSum += lapTimes[i] * combinedWeight;
    totalWeight += combinedWeight;
  }

  let predictedTime = totalWeight > 0 ? weightedSum / totalWeight : lapTimes[lapTimes.length - 1];

  // For trend adjustment, only use non-outlier laps (weight >= 0.5)
  const normalLaps = lapTimes.filter((_, i) => outlierWeights[i] >= 0.5);

  // Apply trend adjustment if runner is slowing
  if (normalLaps.length >= 3) {
    const slope = linearRegressionSlope(normalLaps);

    // If positive slope (slowing down), add trend component
    if (slope > 0) {
      // Add 10% of the projected next step increase
      const trendAdjustment = slope * 0.1;
      predictedTime += trendAdjustment;
    }
  }

  // Calculate confidence score based on consistency of normal laps
  const cv = normalLaps.length >= 2 ? coefficientOfVariation(normalLaps) : coefficientOfVariation(lapTimes);
  let confidence: number;

  if (cv < 0.15) {
    confidence = 0.9; // High consistency
  } else if (cv < 0.25) {
    confidence = 0.7; // Medium consistency
  } else if (cv < 0.35) {
    confidence = 0.5; // Low consistency
  } else {
    confidence = 0.3; // Very low consistency
  }

  // Reduce confidence if we have very few laps
  if (lapTimes.length < 3) {
    confidence *= 0.7;
  }

  // Reduce confidence if we have too many outliers
  const outlierCount = outlierWeights.filter(w => w < 1.0).length;
  if (outlierCount > lapTimes.length / 2) {
    confidence *= 0.8; // Many outliers = less confidence
  }

  return {
    predictedLapTime: Math.max(0, predictedTime),
    confidence,
    recentLaps: lapTimes,
  };
}

/**
 * Calculate time until passing based on last passing time and predicted lap time
 */
export function calculateTimeUntilPassing(
  lastPassingTime: string,
  predictedLapTimeSec: number,
  currentTime: Date = new Date()
): number {
  const lastPassing = new Date(lastPassingTime);
  const elapsedSinceLastPassing =
    (currentTime.getTime() - lastPassing.getTime()) / 1000;
  const timeUntilPassing = predictedLapTimeSec - elapsedSinceLastPassing;
  return timeUntilPassing;
}

/**
 * Calculate time offset for crew spot based on distance and pace
 * @param lapDistanceKm - Full lap distance in km
 * @param crewSpotOffsetMeters - Crew spot offset in meters (positive = after timing mat)
 * @param predictedLapTimeSec - Predicted lap time in seconds
 * @returns Time offset in seconds (positive = after timing mat)
 */
export function calculateCrewSpotTimeOffset(
  lapDistanceKm: number,
  crewSpotOffsetMeters: number,
  predictedLapTimeSec: number
): number {
  if (lapDistanceKm <= 0 || predictedLapTimeSec <= 0) return 0;

  // Calculate average pace (seconds per meter)
  const lapDistanceMeters = lapDistanceKm * 1000;
  const paceSecPerMeter = predictedLapTimeSec / lapDistanceMeters;

  // Calculate time offset
  const timeOffsetSec = crewSpotOffsetMeters * paceSecPerMeter;
  return timeOffsetSec;
}
