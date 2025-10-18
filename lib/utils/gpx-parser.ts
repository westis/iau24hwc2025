// lib/utils/gpx-parser.ts
// GPX file parser for extracting course coordinates and calculating distances

export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  distanceFromStart: number; // meters
}

export interface GPXTrack {
  points: GPXPoint[];
  totalDistance: number; // meters
  name?: string;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of first point (degrees)
 * @param lon1 Longitude of first point (degrees)
 * @param lat2 Latitude of second point (degrees)
 * @param lon2 Longitude of second point (degrees)
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parse GPX XML string and extract track data
 * @param gpxXml GPX file content as XML string
 * @returns Parsed GPX track with calculated distances
 */
export function parseGPX(gpxXml: string): GPXTrack {
  // Node.js compatible GPX parser using regex
  // Extract track name
  const trackNameMatch = gpxXml.match(/<trk>[\s\S]*?<name>(.*?)<\/name>/);
  const trackName = trackNameMatch ? trackNameMatch[1] : undefined;

  // Extract all trackpoints using regex
  const trkptRegex =
    /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  const trackpoints: Array<{
    lat: number;
    lon: number;
    ele?: number;
    time?: string;
  }> = [];

  let match;
  while ((match = trkptRegex.exec(gpxXml)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const trkptContent = match[3];

    // Extract elevation if present
    const eleMatch = trkptContent.match(/<ele>(.*?)<\/ele>/);
    const ele = eleMatch ? parseFloat(eleMatch[1]) : undefined;

    // Extract time if present
    const timeMatch = trkptContent.match(/<time>(.*?)<\/time>/);
    const time = timeMatch ? timeMatch[1] : undefined;

    trackpoints.push({ lat, lon, ele, time });
  }

  if (trackpoints.length === 0) {
    throw new Error("No trackpoints found in GPX file");
  }

  const points: GPXPoint[] = [];
  let cumulativeDistance = 0;

  trackpoints.forEach((trkpt, index) => {
    // Calculate distance from previous point
    if (index > 0) {
      const prevPoint = points[index - 1];
      const distance = haversineDistance(
        prevPoint.lat,
        prevPoint.lon,
        trkpt.lat,
        trkpt.lon
      );
      cumulativeDistance += distance;
    }

    points.push({
      lat: trkpt.lat,
      lon: trkpt.lon,
      ele: trkpt.ele,
      time: trkpt.time,
      distanceFromStart: cumulativeDistance,
    });
  });

  return {
    points,
    totalDistance: cumulativeDistance,
    name: trackName,
  };
}

/**
 * Find the closest point on the track to given coordinates
 * @param track GPX track data
 * @param lat Target latitude
 * @param lon Target longitude
 * @returns Index of closest point
 */
export function findClosestPoint(
  track: GPXTrack,
  lat: number,
  lon: number
): number {
  let minDistance = Infinity;
  let closestIndex = 0;

  track.points.forEach((point, index) => {
    const distance = haversineDistance(lat, lon, point.lat, point.lon);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Find the closest point on the track to given coordinates
 * @param track GPX track data
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @returns Object with index, distance, and point
 */
export function findClosestPointOnTrack(
  track: GPXTrack,
  targetLat: number,
  targetLon: number
): { index: number; distance: number; point: GPXTrack["points"][0] } {
  let closestIndex = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < track.points.length; i++) {
    const point = track.points[i];
    const distance = haversineDistance(
      targetLat,
      targetLon,
      point.lat,
      point.lon
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return {
    index: closestIndex,
    distance: closestDistance,
    point: track.points[closestIndex],
  };
}

/**
 * Rotate track so that a specific point becomes the start (0%) and end (100%)
 * @param track GPX track data
 * @param startIndex Index of the point that should be 0%/100%
 * @returns New track with rotated points and recalculated distances
 */
export function rotateTrackToStart(
  track: GPXTrack,
  startIndex: number
): GPXTrack {
  if (startIndex === 0) {
    return track; // Already at start
  }

  // Rotate points array so startIndex becomes index 0
  const rotatedPoints = [
    ...track.points.slice(startIndex),
    ...track.points.slice(0, startIndex),
  ];

  // Recalculate distances from the new start point
  const pointsWithDistance: typeof track.points = [];
  
  for (let i = 0; i < rotatedPoints.length; i++) {
    const point = rotatedPoints[i];
    
    if (i === 0) {
      pointsWithDistance.push({ ...point, distanceFromStart: 0 });
    } else {
      const prevPoint = pointsWithDistance[i - 1]; // Use newly calculated point!
      const segmentDistance = haversineDistance(
        prevPoint.lat,
        prevPoint.lon,
        point.lat,
        point.lon
      );
      
      pointsWithDistance.push({
        ...point,
        distanceFromStart: prevPoint.distanceFromStart + segmentDistance,
      });
    }
  }

  const totalDistance =
    pointsWithDistance[pointsWithDistance.length - 1].distanceFromStart || 0;

  return {
    ...track,
    points: pointsWithDistance,
    totalDistance,
  };
}

/**
 * Reverse track direction (for when GPX was recorded opposite to race direction)
 * @param track GPX track data
 * @returns New track with reversed points and recalculated distances
 */
export function reverseTrack(track: GPXTrack): GPXTrack {
  // Reverse the points array
  const reversedPoints = [...track.points].reverse();

  // Recalculate distances from the new start point
  const pointsWithDistance: typeof track.points = [];
  
  for (let i = 0; i < reversedPoints.length; i++) {
    const point = reversedPoints[i];
    
    if (i === 0) {
      pointsWithDistance.push({ ...point, distanceFromStart: 0 });
    } else {
      const prevPoint = pointsWithDistance[i - 1]; // Use newly calculated point!
      const segmentDistance = haversineDistance(
        prevPoint.lat,
        prevPoint.lon,
        point.lat,
        point.lon
      );
      
      pointsWithDistance.push({
        ...point,
        distanceFromStart: prevPoint.distanceFromStart + segmentDistance,
      });
    }
  }

  const totalDistance =
    pointsWithDistance[pointsWithDistance.length - 1].distanceFromStart || 0;

  return {
    ...track,
    points: pointsWithDistance,
    totalDistance,
  };
}

/**
 * Get position on track based on progress percentage
 * @param track GPX track data (should be rotated to start at timing mat)
 * @param progressPercent Progress through the lap (can exceed 100% for overshoot scenarios)
 * @returns Coordinates at that progress point
 */
export function getPositionAtProgress(
  track: GPXTrack,
  progressPercent: number
): { lat: number; lon: number } {
  // Allow values > 100% to wrap around the track (e.g., 105% -> 5%)
  // This enables smooth "overshoot" animation when waiting for timing mat confirmation
  const wrappedProgress = progressPercent >= 0 ? progressPercent % 100 : 0;

  // Calculate target distance along track
  const targetDistance = (wrappedProgress / 100) * track.totalDistance;

  // Find the two points that bracket this distance
  let prevPoint = track.points[0];
  for (let i = 1; i < track.points.length; i++) {
    const currPoint = track.points[i];

    if (currPoint.distanceFromStart >= targetDistance) {
      // Interpolate between prevPoint and currPoint
      const segmentDistance =
        currPoint.distanceFromStart - prevPoint.distanceFromStart;
      const distanceIntoPrevSegment =
        targetDistance - prevPoint.distanceFromStart;
      const ratio =
        segmentDistance > 0 ? distanceIntoPrevSegment / segmentDistance : 0;

      return {
        lat: prevPoint.lat + (currPoint.lat - prevPoint.lat) * ratio,
        lon: prevPoint.lon + (currPoint.lon - prevPoint.lon) * ratio,
      };
    }

    prevPoint = currPoint;
  }

  // If we've gone past the end, return the last point
  const lastPoint = track.points[track.points.length - 1];
  return { lat: lastPoint.lat, lon: lastPoint.lon };
}

/**
 * Get distance along track for a given point
 * @param track GPX track data
 * @param pointIndex Index of the point
 * @returns Distance from start in meters
 */
export function getDistanceAtPoint(
  track: GPXTrack,
  pointIndex: number
): number {
  if (pointIndex < 0 || pointIndex >= track.points.length) {
    return 0;
  }
  return track.points[pointIndex].distanceFromStart;
}
