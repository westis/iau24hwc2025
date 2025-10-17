// lib/utils/time-format.ts
// Utility functions for formatting time in different units

import type { Translations } from "@/lib/i18n/types";

export interface RelativeTimeResult {
  value: number;
  unit: "seconds" | "minutes" | "hours" | "days";
  unitText: string;
}

/**
 * Formats minutes into the most appropriate time unit (seconds, minutes, hours, or days)
 * @param minutes - The number of minutes to format
 * @param translations - The translations object for localized unit names
 * @returns An object with the formatted value, unit type, and localized unit text
 */
export function formatRelativeTime(
  minutes: number,
  translations: Translations
): RelativeTimeResult {
  // If less than 1 minute, show in seconds
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    const unitText = seconds === 1
      ? translations.live.timeUnitsSecond
      : translations.live.timeUnitsSeconds;
    return {
      value: seconds,
      unit: "seconds",
      unitText,
    };
  }

  // If less than 60 minutes, show in minutes
  if (minutes < 60) {
    const value = Math.round(minutes);
    const unitText = value === 1
      ? translations.live.timeUnitsMinute
      : translations.live.timeUnitsMinutes;
    return {
      value,
      unit: "minutes",
      unitText,
    };
  }

  // If less than 24 hours, show in hours
  if (minutes < 1440) { // 24 * 60 = 1440
    const hours = Math.round(minutes / 60);
    const unitText = hours === 1
      ? translations.live.timeUnitsHour
      : translations.live.timeUnitsHours;
    return {
      value: hours,
      unit: "hours",
      unitText,
    };
  }

  // Otherwise show in days
  const days = Math.round(minutes / 1440);
  const unitText = days === 1
    ? translations.live.timeUnitsDay
    : translations.live.timeUnitsDays;
  return {
    value: days,
    unit: "days",
    unitText,
  };
}

/**
 * Formats minutes into a human-readable string with proper pluralization
 * @param minutes - The number of minutes to format
 * @param translations - The translations object for localized unit names
 * @returns A formatted string like "30 seconds" or "2 minutes" or "1 hour"
 */
export function formatRelativeTimeString(
  minutes: number,
  translations: Translations
): string {
  const { value, unitText } = formatRelativeTime(minutes, translations);
  return `${value} ${unitText}`;
}
