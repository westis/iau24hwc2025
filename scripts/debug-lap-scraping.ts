#!/usr/bin/env tsx
// Debug what Puppeteer is actually scraping from BreizhChrono

import { BreizhChronoAdapter } from '../lib/live-race/breizh-chrono-adapter'

async function main() {
  const url = process.env.BREIZH_CHRONO_URL || 'https://live.breizhchrono.com/external/live5/classements.jsp?reference=iau24hwc2025'

  const adapter = new BreizhChronoAdapter(url)

  // Test scraping for bib 212
  const testBibs = [212, 94]

  console.log('Fetching lap data via Puppeteer...\n')
  const laps = await adapter.fetchLapDataForRunners(testBibs)

  console.log(`Found ${laps.length} lap records\n`)

  // Show first 5 laps for each runner
  for (const bib of testBibs) {
    const bibLaps = laps.filter(l => l.bib === bib)
    console.log(`\nBib ${bib}: ${bibLaps.length} laps`)
    console.log('First 5 laps:')
    console.table(bibLaps.slice(0, 5).map(l => ({
      lap: l.lap,
      lapTimeSec: l.lapTimeSec,
      formatted: formatTime(l.lapTimeSec)
    })))

    console.log('Last 3 laps:')
    console.table(bibLaps.slice(-3).map(l => ({
      lap: l.lap,
      lapTimeSec: l.lapTimeSec,
      formatted: formatTime(l.lapTimeSec)
    })))
  }

  process.exit(0)
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

main().catch(console.error)
