// Shared color utilities for runner markers (map and sidebar)

import type { RunnerPosition } from "@/types/live-race";

/**
 * Get marker color based on gender, rank, and status
 * Used consistently across map markers and sidebar badges
 * Colors are theme-independent and will display the same in light/dark mode
 *
 * @param genderRank - Runner's rank within their gender
 * @param status - Runner's current status (racing, overdue, break)
 * @param gender - Runner's gender (m/w)
 * @param isTop6Mode - Whether top 6 selection mode is active (for special podium colors)
 */
export function getMarkerColor(
  genderRank: number,
  status: RunnerPosition["status"],
  gender: "m" | "w",
  isTop6Mode: boolean = false
): string {
  if (status === "overdue") return "#f97316"; // orange
  if (status === "break") return "#ef4444"; // red

  // Racing - special colors for top 6 mode
  if (isTop6Mode && status === "racing") {
    if (genderRank === 1) return "#FFD700"; // gold
    if (genderRank === 2) return "#C0C0C0"; // silver
    if (genderRank === 3) return "#CD7F32"; // bronze
    if (genderRank <= 6) return "#3b82f6"; // blue for 4-6
  }

  // Racing - gender-based colors (default)
  if (gender === "m") return "#104760"; // men - dark teal/blue
  return "#00AF50"; // women - green
}

/**
 * Get text color for the bib number based on background
 * Returns white or black depending on background color brightness
 */
export function getTextColor(
  genderRank: number,
  status: RunnerPosition["status"],
  gender: "m" | "w",
  isTop6Mode: boolean = false
): string {
  // For top 6 mode special colors
  if (isTop6Mode && status === "racing") {
    if (genderRank === 1) return "#000000"; // black text on gold
    if (genderRank === 2) return "#000000"; // black text on silver
    if (genderRank === 3) return "#ffffff"; // white text on bronze
    if (genderRank <= 6) return "#ffffff"; // white text on blue
  }

  // All other colors use white text
  return "#ffffff";
}
