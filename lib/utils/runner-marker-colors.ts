// Shared color utilities for runner markers (map and sidebar)

import type { RunnerPosition } from "@/types/live-race";

/**
 * Get marker color based on gender rank and status
 * Used consistently across map markers and sidebar badges
 * Colors are theme-independent and will display the same in light/dark mode
 */
export function getMarkerColor(
  genderRank: number,
  status: RunnerPosition["status"]
): string {
  if (status === "overdue") return "#f97316"; // orange
  if (status === "break") return "#ef4444"; // red

  // Racing - color by gender rank
  if (genderRank === 1) return "#fbbf24"; // gold
  if (genderRank <= 3) return "#6b7280"; // darker silver/gray for white text
  if (genderRank <= 10) return "#92400e"; // darker bronze for white text
  return "#1e40af"; // darker blue for white text
}

/**
 * Get text color for the bib number based on background
 * All backgrounds are now dark enough for white text
 */
export function getTextColor(
  genderRank: number,
  status: RunnerPosition["status"]
): string {
  // Gold needs black text, all others use white
  if (status === "racing" && genderRank === 1) return "#000000";
  return "#ffffff";
}
