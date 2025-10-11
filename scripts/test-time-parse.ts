#!/usr/bin/env tsx
// Test time parsing

function parsePerformance(perfText: string): number {
  // Check if it's a time format (contains ":")
  if (perfText.includes(':')) {
    // Parse time string like "10:08:00 h" and convert to total seconds
    const timeMatch = perfText.match(/(\d+):(\d+):(\d+)/)
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10)
      const minutes = parseInt(timeMatch[2], 10)
      const seconds = parseInt(timeMatch[3], 10)
      return hours * 3600 + minutes * 60 + seconds
    }
  }
  // For distance-based results (km), parse as float
  const perfFloat = parseFloat(perfText)
  if (!isNaN(perfFloat)) {
    return perfFloat
  }
  return 0
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Test cases
const testCases = [
  "10:08:00 h",  // 10 hours, 8 minutes, 0 seconds
  "4:45:22 h",   // 4 hours, 45 minutes, 22 seconds
  "7:48:57 h",   // 7 hours, 48 minutes, 57 seconds
  "234.567",     // 24h result in km
]

console.log('=== Time Parsing Tests ===\n')

for (const testCase of testCases) {
  const parsed = parsePerformance(testCase)
  if (testCase.includes(':')) {
    const formatted = formatTime(parsed)
    console.log(`Input:     "${testCase}"`)
    console.log(`Parsed:    ${parsed} seconds`)
    console.log(`Formatted: ${formatted}`)
    console.log('---')
  } else {
    console.log(`Input:     "${testCase}"`)
    console.log(`Parsed:    ${parsed} km`)
    console.log('---')
  }
}
