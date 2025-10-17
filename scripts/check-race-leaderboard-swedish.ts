#!/usr/bin/env tsx
// Check Swedish runners in race_leaderboard vs runners table

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function checkLeaderboardSwedish() {
  const db = getDatabase();

  console.log("🔍 Checking Swedish runners in race_leaderboard...\n");

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

  // Get Swedish runners from leaderboard
  console.log("📊 Swedish runners in race_leaderboard:");
  const leaderboardSwedish = await db.query(
    `SELECT bib, name, country, rank, gender_rank, distance_km
     FROM race_leaderboard
     WHERE race_id = $1 AND country = 'SWE'
     ORDER BY bib`,
    [raceId]
  );

  if (leaderboardSwedish.rows.length === 0) {
    console.log("❌ NO Swedish runners found in race_leaderboard!\n");
  } else {
    console.log(`Found ${leaderboardSwedish.rows.length} Swedish runners:\n`);
    leaderboardSwedish.rows.forEach((r: any) => {
      console.log(`  #${r.bib} ${r.name} - Rank ${r.rank}, ${r.distance_km}km`);
    });
  }

  // Get all runners from leaderboard to see what countries exist
  console.log("\n📊 All countries in race_leaderboard:");
  const allCountries = await db.query(
    `SELECT DISTINCT country, COUNT(*) as count
     FROM race_leaderboard
     WHERE race_id = $1
     GROUP BY country
     ORDER BY country`,
    [raceId]
  );

  allCountries.rows.forEach((r: any) => {
    console.log(`  ${r.country}: ${r.count} runners`);
  });

  // Get Swedish runners from runners table
  console.log("\n👥 Swedish runners in runners table (for comparison):");
  const runnersSwedish = await db.query(
    `SELECT bib, firstname, lastname, nationality,
            avatar_url IS NOT NULL as has_avatar
     FROM runners
     WHERE nationality = 'SWE'
     ORDER BY bib
     LIMIT 10`
  );

  console.log(`Found ${runnersSwedish.rows.length} Swedish runners in runners table (showing first 10):\n`);
  runnersSwedish.rows.forEach((r: any) => {
    console.log(`  #${r.bib} ${r.firstname} ${r.lastname} - Avatar: ${r.has_avatar ? "✅" : "❌"}`);
  });

  // Check if any Swedish runners from runners table are in leaderboard
  console.log("\n🔗 Cross-checking: Which Swedish runners (from runners table) are in the leaderboard?");
  const crossCheck = await db.query(
    `SELECT r.bib, r.firstname, r.lastname, r.nationality,
            l.bib IS NOT NULL as in_leaderboard,
            l.country as leaderboard_country
     FROM runners r
     LEFT JOIN race_leaderboard l ON r.bib = l.bib AND l.race_id = $1
     WHERE r.nationality = 'SWE'
     ORDER BY r.bib
     LIMIT 20`,
    [raceId]
  );

  const inLeaderboard = crossCheck.rows.filter((r: any) => r.in_leaderboard);
  const notInLeaderboard = crossCheck.rows.filter((r: any) => !r.in_leaderboard);

  console.log(`\n✅ In leaderboard (${inLeaderboard.length}):`);
  inLeaderboard.slice(0, 10).forEach((r: any) => {
    console.log(`  #${r.bib} ${r.firstname} ${r.lastname} (country in leaderboard: ${r.leaderboard_country})`);
  });

  console.log(`\n❌ Not in leaderboard (${notInLeaderboard.length}):`);
  notInLeaderboard.slice(0, 10).forEach((r: any) => {
    console.log(`  #${r.bib} ${r.firstname} ${r.lastname}`);
  });

  process.exit(0);
}

checkLeaderboardSwedish().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
