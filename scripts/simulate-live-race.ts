#!/usr/bin/env tsx
/**
 * Live Race Simulator - Replays mock race data in real-time
 *
 * This script simulates a live race by progressively inserting lap data
 * as if runners are actually crossing the timing mat in real-time.
 *
 * Usage:
 *   npm run simulate-live [speed] [maxHours]
 *
 * Examples:
 *   npm run simulate-live          # Normal speed (1x), full 24h race
 *   npm run simulate-live 60       # 60x speed (1 minute = 1 hour)
 *   npm run simulate-live 120 12   # 120x speed, simulate only first 12 hours
 */

const SPEED_MULTIPLIER = parseFloat(process.argv[2] || "60"); // Default: 60x speed
const MAX_HOURS = parseFloat(process.argv[3] || "24"); // Default: full race
const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

let isRunning = true;

async function disableSimulationMode() {
  try {
    await fetch(`${API_URL}/api/race/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulationMode: false,
        currentRaceTimeSec: 0,
      }),
    });
    console.log("✅ Simulation mode disabled");
  } catch (err) {
    console.error("⚠️  Failed to disable simulation mode:", err);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n⏹️  Stopping simulation...");
  isRunning = false;
  await disableSimulationMode();
  process.exit(0);
});

async function clearRaceData() {
  console.log("🗑️  Clearing existing race data...");
  try {
    const res = await fetch(`${API_URL}/api/race/clear`, {
      method: "POST",
    });
    if (!res.ok) {
      console.warn("⚠️  Could not clear data (endpoint may not exist)");
    } else {
      console.log("✅ Race data cleared");
    }
  } catch (err) {
    console.warn("⚠️  Could not clear data, continuing anyway...");
  }
}

async function setRaceState(state: "not_started" | "live" | "finished") {
  await fetch(`${API_URL}/api/race/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raceState: state }),
  });
}

async function insertLap(lap: any, raceId: number) {
  await fetch(`${API_URL}/api/race/insert-lap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lap, raceId }),
  });
}

async function updateLeaderboard(leaderboard: any[], raceId: number) {
  await fetch(`${API_URL}/api/race/update-leaderboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leaderboard, raceId }),
  });
}

async function updateCurrentRaceTime(raceTimeSec: number, raceId: number) {
  await fetch(`${API_URL}/api/race/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentRaceTimeSec: Math.floor(raceTimeSec) }),
  });
}

async function simulateLiveRace() {
  console.log("\n🏁 IAU 24H World Championship - Live Race Simulator\n");
  console.log(
    `⚡ Speed: ${SPEED_MULTIPLIER}x (1 real second = ${SPEED_MULTIPLIER} race seconds)`
  );
  console.log(`⏱️  Duration: First ${MAX_HOURS} hours of race`);
  console.log(`🔄 Updates: Real-time as laps complete`);
  console.log(`\n⏸️  Press Ctrl+C to stop at any time\n`);

  // Step 1: Generate full mock data
  console.log("📊 Generating mock race data...");
  const generateRes = await fetch(
    `${API_URL}/api/race/mock-data?hours=${MAX_HOURS}`
  );

  if (!generateRes.ok) {
    throw new Error(`Failed to generate mock data: ${generateRes.statusText}`);
  }

  const mockData = await generateRes.json();
  console.log(
    `✅ Generated ${mockData.laps.length} laps for ${mockData.totalRunners} runners\n`
  );

  // Step 2: Clear existing data
  await clearRaceData();

  // Step 3: Enable simulation mode and set race to live
  await fetch(`${API_URL}/api/race/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      simulationMode: true,
      simulationStartTime: new Date().toISOString(),
      currentRaceTimeSec: 0,
    }),
  });
  await setRaceState("live");
  console.log("🔴 Race state: LIVE (SIMULATION MODE)\n");

  // Step 4: Sort all laps by race time
  const allLaps = mockData.laps.sort(
    (a: any, b: any) => a.raceTimeSec - b.raceTimeSec
  );

  // Group laps by runner for leaderboard calculation
  const runnerProgress = new Map<number, any[]>();
  mockData.laps.forEach((lap: any) => {
    if (!runnerProgress.has(lap.bib)) {
      runnerProgress.set(lap.bib, []);
    }
    runnerProgress.get(lap.bib)!.push(lap);
  });

  // Get race ID
  const raceRes = await fetch(`${API_URL}/api/race`);
  const raceInfo = await raceRes.json();
  const raceId = raceInfo.id || 1;

  // Step 5: Start simulation
  const startTime = Date.now();
  let lastUpdateTime = 0;
  let processedLaps = 0;
  let lastProgressUpdate = Date.now();

  console.log("🏃 Race started! Watch at: " + API_URL + "/live\n");
  console.log("─".repeat(70));

  for (const lap of allLaps) {
    if (!isRunning) break;

    const raceTimeSec = lap.raceTimeSec;
    const realTimeElapsedMs = Date.now() - startTime;
    const simulatedRaceTimeSec = (realTimeElapsedMs / 1000) * SPEED_MULTIPLIER;

    // Wait until we reach this lap's time
    const waitTimeMs =
      ((raceTimeSec - simulatedRaceTimeSec) / SPEED_MULTIPLIER) * 1000;

    if (waitTimeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
    }

    // Insert the lap
    await insertLap(lap, raceId);
    processedLaps++;

    // Update progress every second
    const now = Date.now();
    if (now - lastProgressUpdate >= 1000) {
      const hours = Math.floor(raceTimeSec / 3600);
      const minutes = Math.floor((raceTimeSec % 3600) / 60);
      const seconds = Math.floor(raceTimeSec % 60);
      const realSeconds = Math.floor((now - startTime) / 1000);

      process.stdout.write(
        `\r⏱️  Race time: ${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")} | ` +
          `Laps: ${processedLaps}/${allLaps.length} | ` +
          `Real time: ${realSeconds}s | ` +
          `Runner #${lap.bib} - Lap ${lap.lap}`
      );

      lastProgressUpdate = now;
    }

    // Update current race time every 5 seconds
    if (raceTimeSec - lastUpdateTime >= 5) {
      await updateCurrentRaceTime(raceTimeSec, raceId);

      // Calculate current leaderboard
      const currentLeaderboard = Array.from(runnerProgress.entries())
        .map(([bib, laps]) => {
          // Get all laps up to current race time
          const completedLaps = laps.filter(
            (l: any) => l.raceTimeSec <= raceTimeSec
          );
          if (completedLaps.length === 0) return null;

          const lastLap = completedLaps[completedLaps.length - 1];
          const runner = mockData.leaderboard.find((r: any) => r.bib === bib);
          if (!runner) return null;

          // Calculate projection
          const avgSpeed = lastLap.distanceKm / raceTimeSec; // km/s
          const projectedKm = avgSpeed * 86400; // 24 hours

          // Calculate last passing time (when they crossed the timing mat)
          const lastPassingTime = new Date(
            Date.now() - (raceTimeSec - lastLap.raceTimeSec) * 1000
          ).toISOString();

          return {
            ...runner,
            distanceKm: lastLap.distanceKm,
            projectedKm,
            raceTimeSec: lastLap.raceTimeSec,
            lapPaceSec: lastLap.lapPace,
            lapTimeSec: lastLap.lapTimeSec,
            lap: completedLaps.length,
            timestamp: new Date().toISOString(),
            lastPassing: lastPassingTime,
          };
        })
        .filter((r): r is any => r !== null)
        .sort((a, b) => {
          // Primary sort: by distance (descending)
          if (b.distanceKm !== a.distanceKm) {
            return b.distanceKm - a.distanceKm;
          }
          // Secondary sort: if same distance, earlier last passing time ranks higher
          return (
            new Date(a.lastPassing).getTime() -
            new Date(b.lastPassing).getTime()
          );
        })
        .map((runner, index) => ({
          ...runner,
          rank: index + 1,
        }));

      // Assign gender ranks
      const menRank = new Map();
      const womenRank = new Map();
      let mCount = 0;
      let wCount = 0;

      currentLeaderboard.forEach((runner) => {
        if (runner.gender === "m") {
          mCount++;
          menRank.set(runner.bib, mCount);
        } else {
          wCount++;
          womenRank.set(runner.bib, wCount);
        }
      });

      currentLeaderboard.forEach((runner) => {
        runner.genderRank =
          runner.gender === "m"
            ? menRank.get(runner.bib)
            : womenRank.get(runner.bib);
      });

      await updateLeaderboard(currentLeaderboard, raceId);
      lastUpdateTime = raceTimeSec;
    }
  }

  console.log("\n" + "─".repeat(70));
  console.log("\n✅ Simulation complete!");
  console.log(`\n📊 Final Stats:`);
  console.log(`   - Total laps processed: ${processedLaps}`);
  console.log(`   - Runners: ${mockData.totalRunners}`);
  console.log(`   - Simulated race time: ${MAX_HOURS} hours`);
  console.log(
    `   - Real time elapsed: ${Math.floor((Date.now() - startTime) / 1000)}s`
  );
  console.log(`\n🏁 View final results at: ${API_URL}/live`);
  console.log(
    `\n💡 Simulation mode is still ON. The race clock will show the simulated time.`
  );
  console.log(`   To turn OFF simulation mode and remove the orange banner:`);
  console.log(`   Run: npm run stop-sim\n`);
}

// Run the simulation
simulateLiveRace().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});

 
 e x p o r t   { } ; 
 
 