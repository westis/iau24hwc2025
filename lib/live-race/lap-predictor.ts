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
 * Identify break laps using statistical outlier detection
 * Returns indices of laps that are likely breaks
 */
function identifyBreakLaps(lapTimes: number[]): Set<number> {
  if (lapTimes.length < 3) return new Set();

  const medianTime = median(lapTimes);
  const breakThreshold = medianTime * 1.75; // Laps > 175% of median are likely breaks
  const breakIndices = new Set<number>();

  lapTimes.forEach((time, index) => {
    if (time > breakThreshold) {
      breakIndices.add(index);
    }
  });

  return breakIndices;
}

/**
 * Predict next lap time using weighted moving average with trend adjustment
 * @param laps - Array of recent lap data (should be sorted by lap number ascending)
 * @param maxLaps - Maximum number of laps to consider (default: 10)
 * @returns Prediction result with confidence score
 */
export function predictNextLapTime(
  laps: LapTime[],
  maxLaps: number = 10
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

  // Identify and exclude break laps
  const breakIndices = identifyBreakLaps(lapTimes);
  const validLapTimes = lapTimes.filter((_, index) => !breakIndices.has(index));

  // Need at least 2 valid laps for prediction
  if (validLapTimes.length < 2) {
    // Fall back to all laps if filtering removed too much
    const fallbackLaps = lapTimes.slice(-Math.min(5, lapTimes.length));
    return {
      predictedLapTime:
        fallbackLaps.reduce((sum, t) => sum + t, 0) / fallbackLaps.length,
      confidence: 0.3,
      recentLaps: fallbackLaps,
    };
  }

  // Use last 5 valid laps for weighted average
  const lapsForPrediction = validLapTimes.slice(-5);

  // Calculate weighted moving average (more recent = higher weight)
  const weights = [1, 2, 3, 4, 5]; // Weights for oldest to newest
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < lapsForPrediction.length; i++) {
    const weight = weights[weights.length - lapsForPrediction.length + i];
    weightedSum += lapsForPrediction[i] * weight;
    totalWeight += weight;
  }

  let predictedTime = weightedSum / totalWeight;

  // Apply trend adjustment if runner is slowing
  if (lapsForPrediction.length >= 3) {
    const slope = linearRegressionSlope(lapsForPrediction);

    // If positive slope (slowing down), add trend component
    if (slope > 0) {
      // Add 10% of the projected next step increase
      const trendAdjustment = slope * 0.1;
      predictedTime += trendAdjustment;
    }
  }

  // Calculate confidence score based on consistency
  const cv = coefficientOfVariation(lapsForPrediction);
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
  if (lapsForPrediction.length < 3) {
    confidence *= 0.7;
  }

  return {
    predictedLapTime: Math.max(0, predictedTime),
    confidence,
    recentLaps: lapsForPrediction,
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
