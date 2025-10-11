#!/usr/bin/env tsx
// Test script to check what rank fields are available in DUV API

const DUV_JSON_API_BASE = 'https://statistik.d-u-v.org/json'

async function testDUVRankFields() {
  // Test with runner ID 2302 (from docs example)
  const url = `${DUV_JSON_API_BASE}/mgetresultperson.php?runner=2302&plain=1`

  console.log('Fetching:', url)
  const response = await fetch(url)
  const data = await response.json()

  console.log('\n=== Available top-level keys ===')
  console.log(Object.keys(data))

  console.log('\n=== PersonHeader ===')
  console.log(JSON.stringify(data.PersonHeader, null, 2))

  if (data.AllPerfs && data.AllPerfs.length > 0) {
    console.log('\n=== First year in AllPerfs ===')
    console.log(Object.keys(data.AllPerfs[0]))

    if (data.AllPerfs[0].PerfsPerYear && data.AllPerfs[0].PerfsPerYear.length > 0) {
      const firstPerf = data.AllPerfs[0].PerfsPerYear[0]
      console.log('\n=== First performance - ALL fields ===')
      console.log(JSON.stringify(firstPerf, null, 2))

      console.log('\n=== All rank-related fields in first performance ===')
      Object.keys(firstPerf).forEach(key => {
        if (key.toLowerCase().includes('rank')) {
          console.log(`${key}: ${firstPerf[key]}`)
        }
      })
    }
  }
}

testDUVRankFields().catch(console.error)
