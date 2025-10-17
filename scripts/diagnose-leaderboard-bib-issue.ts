#!/usr/bin/env tsx
// Diagnose the bib vs ID issue in race_leaderboard

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function diagnoseLeaderboardBibIssue() {
  const db = getDatabase();

  console.log("🔍 Diagnosing race_leaderboard bib vs ID issue...\n");

  // Get active race
  const raceResult = await db.query(
    `SELECT id FROM race_info WHERE is_active = true`
  );

  if (raceResult.rows.length === 0) {
    console.log("❌ No active race found!");
    process.exit(1);
  }

  const raceId = raceResult.rows[0].id;
  console.log(`✅ Active race ID: ${raceId}\n`);

  // Check specific case: Torbjörn Gyllebring
  console.log("📊 Checking Torbjörn Gyllebring (real bib should be 199):\n");

  // Find in runners table
  const runnerResult = await db.query(
    `SELECT id, bib, firstname, lastname, nationality
     FROM runners
     WHERE firstname ILIKE '%Torbj%' AND lastname ILIKE '%Gyllebring%'`
  );

  if (runnerResult.rows.length > 0) {
    const runner = runnerResult.rows[0];
    console.log(`In runners table:`);
    console.log(`  Database ID: ${runner.id}`);
    console.log(`  Bib number: ${runner.bib}`);
    console.log(`  Name: ${runner.firstname} ${runner.lastname}`);
    console.log(`  Nationality: ${runner.nationality}\n`);

    // Check if this runner is in leaderboard by bib
    console.log(`Checking race_leaderboard for bib ${runner.bib}:`);
    const leaderboardByBib = await db.query(
      `SELECT bib, name, country FROM race_leaderboard WHERE race_id = $1 AND bib = $2`,
      [raceId, runner.bib]
    );

    if (leaderboardByBib.rows.length > 0) {
      console.log(`  ✅ Found with bib ${runner.bib}: ${leaderboardByBib.rows[0].name}`);
    } else {
      console.log(`  ❌ NOT found with bib ${runner.bib}`);
    }

    // Check if this runner is in leaderboard by database ID (wrong!)
    console.log(`\nChecking race_leaderboard for bib ${runner.id} (database ID - WRONG!):`);
    const leaderboardById = await db.query(
      `SELECT bib, name, country FROM race_leaderboard WHERE race_id = $1 AND bib = $2`,
      [raceId, runner.id]
    );

    if (leaderboardById.rows.length > 0) {
      console.log(`  🚨 FOUND with bib=${runner.id}: ${leaderboardById.rows[0].name}`);
      console.log(`  This confirms the bug: leaderboard has database ID instead of bib number!`);
    } else {
      console.log(`  Not found with database ID`);
    }
  }

  // Sample the leaderboard to see if all entries have this issue
  console.log("\n📊 Sampling race_leaderboard entries (first 10):\n");
  const sampleResult = await db.query(
    `SELECT l.bib as leaderboard_bib, l.name,
            r.id as runner_db_id, r.bib as runner_real_bib, r.firstname, r.lastname
     FROM race_leaderboard l
     LEFT JOIN runners r ON l.bib = r.bib
     WHERE l.race_id = $1
     ORDER BY l.rank
     LIMIT 10`,
    [raceId]
  );

  console.log("Matching leaderboard.bib with runners.bib:");
  sampleResult.rows.forEach((row: any) => {
    if (row.runner_db_id) {
      console.log(`  Leaderboard bib ${row.leaderboard_bib} → Runner #${row.runner_real_bib} ${row.firstname} ${row.lastname} (DB ID: ${row.runner_db_id})`);
    } else {
      console.log(`  Leaderboard bib ${row.leaderboard_bib} → NOT FOUND in runners table`);
    }
  });

  // Try joining by database ID instead
  console.log("\n📊 Testing if leaderboard.bib actually contains runner database IDs:\n");
  const joinByIdResult = await db.query(
    `SELECT l.bib as leaderboard_bib, l.name as leaderboard_name,
            r.id as runner_db_id, r.bib as runner_real_bib, r.firstname, r.lastname
     FROM race_leaderboard l
     LEFT JOIN runners r ON l.bib = r.id
     WHERE l.race_id = $1
     ORDER BY l.rank
     LIMIT 10`,
    [raceId]
  );

  console.log("Matching leaderboard.bib with runners.id (database ID):");
  let matchCount = 0;
  joinByIdResult.rows.forEach((row: any) => {
    if (row.runner_db_id) {
      matchCount++;
      console.log(`  ✅ Leaderboard bib ${row.leaderboard_bib} → Runner DB ID ${row.runner_db_id}, REAL bib ${row.runner_real_bib}, ${row.firstname} ${row.lastname}`);
    } else {
      console.log(`  ❌ Leaderboard bib ${row.leaderboard_bib} → NOT FOUND`);
    }
  });

  if (matchCount > 0) {
    console.log(`\n🚨 CONFIRMED: ${matchCount}/10 entries match when joining by database ID!`);
    console.log(`This means race_leaderboard.bib contains runner database IDs instead of bib numbers!`);
  }

  process.exit(0);
}

diagnoseLeaderboardBibIssue().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
