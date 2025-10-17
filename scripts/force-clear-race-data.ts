#!/usr/bin/env tsx
/**
 * Force clear ALL race data
 * Bypasses Supabase RLS by using direct database connection
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getDatabase } from "@/lib/db/database";
import * as readline from "readline";

const FORCE_MODE = process.argv.includes("--force");

async function promptConfirmation(message: string): Promise<boolean> {
  if (FORCE_MODE) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

async function main() {
  const db = getDatabase();

  console.log("\n🚨 FORCE CLEAR ALL RACE DATA (Direct Database Access)\n");
  console.log("=" .repeat(70));

  try {
    // Check what will be deleted
    const lapsCount = await db.query('SELECT COUNT(*) as total FROM race_laps WHERE race_id = 1');
    const leaderboardCount = await db.query('SELECT COUNT(*) as total FROM race_leaderboard WHERE race_id = 1');
    const updatesCount = await db.query('SELECT COUNT(*) as total FROM race_updates WHERE race_id = 1');

    console.log('\n📊 Current Data (Race ID 1):');
    console.log('─'.repeat(70));
    console.log(`  Lap records: ${lapsCount.rows[0].total}`);
    console.log(`  Leaderboard entries: ${leaderboardCount.rows[0].total}`);
    console.log(`  Race updates: ${updatesCount.rows[0].total}`);
    console.log('─'.repeat(70));

    if (lapsCount.rows[0].total === '0' && leaderboardCount.rows[0].total === '0' && updatesCount.rows[0].total === '0') {
      console.log('\n✅ No data to clear!\n');
      return;
    }

    console.log('\n⚠️  WARNING: This will DELETE ALL race data using direct database access');
    console.log('⚠️  This bypasses all Supabase RLS policies');
    console.log('⚠️  Use this only for clearing simulation/test data\n');

    const confirmed = await promptConfirmation('Are you ABSOLUTELY SURE you want to delete all this data?');

    if (!confirmed) {
      console.log('\n❌ Operation cancelled\n');
      return;
    }

    console.log('\n🗑️  Deleting data...\n');

    // Delete using direct SQL
    const lapsResult = await db.query('DELETE FROM race_laps WHERE race_id = 1');
    const leaderboardResult = await db.query('DELETE FROM race_leaderboard WHERE race_id = 1');
    const updatesResult = await db.query('DELETE FROM race_updates WHERE race_id = 1');

    console.log('=' .repeat(70));
    console.log('✅ DATA CLEARED SUCCESSFULLY');
    console.log('=' .repeat(70));
    console.log('\n📊 Summary:');
    console.log(`  Lap records deleted: ${lapsResult.rowCount || 0}`);
    console.log(`  Leaderboard entries deleted: ${leaderboardResult.rowCount || 0}`);
    console.log(`  Race updates deleted: ${updatesResult.rowCount || 0}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⏹️  Operation cancelled by user\n");
  process.exit(0);
});

main();
