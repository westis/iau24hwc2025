#!/usr/bin/env tsx
// Check the actual schema of race_leaderboard table

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function checkLeaderboardSchema() {
  const db = getDatabase();

  console.log("🔍 Checking race_leaderboard table schema...\n");

  // Get column information
  const schemaResult = await db.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'race_leaderboard'
    ORDER BY ordinal_position
  `);

  console.log("Columns in race_leaderboard:\n");
  schemaResult.rows.forEach((col: any) => {
    console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });

  // Get one row to see actual data
  console.log("\n📊 Sample row from race_leaderboard:\n");
  const sampleResult = await db.query(`
    SELECT * FROM race_leaderboard WHERE race_id = 1 LIMIT 1
  `);

  if (sampleResult.rows.length > 0) {
    const row = sampleResult.rows[0];
    console.log("Sample row data:");
    Object.keys(row).forEach(key => {
      console.log(`  ${key}: ${row[key]}`);
    });
  }

  // Check the specific case for Torbjörn
  console.log("\n📊 All rows for Torbjörn Gyllebring in race_leaderboard:\n");
  const torbjornResult = await db.query(`
    SELECT * FROM race_leaderboard
    WHERE race_id = 1 AND name ILIKE '%Torbj%Gyllebring%'
  `);

  if (torbjornResult.rows.length > 0) {
    console.log("Found entries:");
    torbjornResult.rows.forEach((row: any) => {
      console.log("\nEntry:");
      Object.keys(row).forEach(key => {
        console.log(`  ${key}: ${row[key]}`);
      });
    });
  } else {
    console.log("No entries found for Torbjörn Gyllebring");
  }

  process.exit(0);
}

checkLeaderboardSchema().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
