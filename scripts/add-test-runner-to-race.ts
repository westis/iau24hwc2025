#!/usr/bin/env tsx
// Add a runner with avatar to the leaderboard for testing

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function addTestRunner() {
  const db = getDatabase();

  // Add runner #198 (Elov Olsson) to the leaderboard
  const bib = 198;

  console.log(`Adding runner #${bib} to race leaderboard for testing...`);

  await db.query(
    `INSERT INTO race_leaderboard (
      race_id, bib, name, rank, gender_rank, distance_km,
      race_time_sec, lap_pace_sec, lap_time_sec, lap, gender,
      timestamp, country, last_passing
    ) VALUES (
      1, $1, 'Elov Olsson', 1, 1, 5.0,
      3600, 720, 720, 1, 'm',
      NOW(), 'SWE', NOW() - INTERVAL '5 minutes'
    )
    ON CONFLICT (race_id, bib)
    DO UPDATE SET
      name = EXCLUDED.name,
      rank = EXCLUDED.rank,
      last_passing = EXCLUDED.last_passing`,
    [bib]
  );

  // Add a lap for this runner
  await db.query(
    `INSERT INTO race_laps (
      race_id, bib, lap, lap_time_sec, race_time_sec,
      distance_km, rank, gender_rank, age_group_rank,
      lap_pace, avg_pace, timestamp
    ) VALUES (
      1, $1, 1, 720, 720,
      5.0, 1, 1, 1,
      144, 144, NOW() - INTERVAL '5 minutes'
    )
    ON CONFLICT (race_id, bib, lap) DO NOTHING`,
    [bib]
  );

  console.log("✅ Added runner #198 to leaderboard!");
  console.log("\nNow refresh your map and you should see an avatar for runner #198");

  process.exit(0);
}

addTestRunner().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
