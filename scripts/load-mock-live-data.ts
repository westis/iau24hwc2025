#!/usr/bin/env tsx
/**
 * Load mock live race data for testing the live page
 *
 * Usage:
 *   npm run mock-live [hours]
 *
 * Example:
 *   npm run mock-live 12  (simulate 12 hours of race data)
 *   npm run mock-live 6   (simulate 6 hours)
 */

const HOURS = parseFloat(process.argv[2] || "12");
const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function loadMockData() {
  console.log(`\n🏃 Generating mock live race data (${HOURS} hours)...\n`);

  try {
    // Step 1: Generate mock data
    console.log("Step 1: Generating mock data from real runners...");
    const generateRes = await fetch(
      `${API_URL}/api/race/mock-data?hours=${HOURS}`
    );

    if (!generateRes.ok) {
      throw new Error(`Failed to generate: ${generateRes.statusText}`);
    }

    const mockData = await generateRes.json();
    console.log(`✅ Generated data for ${mockData.totalRunners} runners`);
    console.log(`   - ${mockData.laps.length} lap records`);
    console.log(`   - Using real runners: ${mockData.usingRealRunners}`);
    console.log(`   - Course distance: ${mockData.courseDistanceKm} km`);

    // Step 2: Load into database
    console.log("\nStep 2: Loading data into database...");
    const loadRes = await fetch(`${API_URL}/api/race/mock-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        laps: mockData.laps,
        leaderboard: mockData.leaderboard,
      }),
    });

    if (!loadRes.ok) {
      const error = await loadRes.json();
      throw new Error(`Failed to load: ${error.details || loadRes.statusText}`);
    }

    const loadResult = await loadRes.json();
    console.log(`✅ Successfully loaded mock data!`);
    console.log(`   - ${loadResult.lapsInserted} laps inserted`);
    console.log(`   - ${loadResult.runnersInserted} runners in leaderboard`);
    console.log(`   - Race state: LIVE`);

    console.log(
      `\n🎉 Mock data loaded! Visit ${API_URL}/live to see it in action!\n`
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

loadMockData();

