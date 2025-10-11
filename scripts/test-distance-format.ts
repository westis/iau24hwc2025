#!/usr/bin/env tsx
// Test script to check distance/time format in DUV API

const DUV_JSON_API_BASE = 'https://statistik.d-u-v.org/json'

async function testDistanceFormat() {
  // Test with runner ID 2302 (from docs example)
  const url = `${DUV_JSON_API_BASE}/mgetresultperson.php?runner=2302&plain=1`

  console.log('Fetching:', url)
  const response = await fetch(url)
  const data = await response.json()

  if (data.AllPerfs && data.AllPerfs.length > 0) {
    console.log('\n=== Sample performances from different event types ===\n')

    const samples: any[] = []

    // Collect samples from different event types
    for (const yearData of data.AllPerfs) {
      const perfsPerYear = yearData.PerfsPerYear || []
      for (const perf of perfsPerYear) {
        const evtDist = perf.EvtDist || ''

        // Look for different event types
        if (evtDist.includes('24h') || evtDist.includes('6h') || evtDist.includes('12h')) {
          samples.push({ type: 'time-based', perf })
        } else if (evtDist.includes('km') || evtDist.includes('mi')) {
          samples.push({ type: 'distance-based', perf })
        }

        if (samples.length >= 6) break
      }
      if (samples.length >= 6) break
    }

    // Display samples
    for (const sample of samples) {
      console.log(`Type: ${sample.type}`)
      console.log(`Event: ${sample.perf.EvtDist} - ${sample.perf.EvtName}`)
      console.log(`Performance: "${sample.perf.Perf}"`)
      console.log(`Parsed float: ${parseFloat(sample.perf.Perf)}`)
      console.log('---')
    }
  }
}

testDistanceFormat().catch(console.error)
