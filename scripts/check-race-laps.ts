#!/usr/bin/env tsx
/**
 * Check race_laps data
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getDatabase } from "@/lib/db/database";

async function main() {
  const db = getDatabase();

  try {
    // Check laps grouped by race_id
    const lapsByRace = await db.query(`
      SELECT race_id, COUNT(*) as lap_count
      FROM race_laps
      GROUP BY race_id
      ORDER BY race_id;
    `);

    console.log('\n📊 Race Laps by race_id:');
    console.log('─'.repeat(40));
    lapsByRace.rows.forEach((row: any) => {
      console.log(`  Race ID ${row.race_id}: ${row.lap_count} laps`);
    });

    // Total laps
    const total = await db.query('SELECT COUNT(*) as total FROM race_laps');
    console.log(`\n  Total laps: ${total.rows[0].total}`);

    // Check active race
    try {
      const activeRace = await db.query(`
        SELECT id, race_name FROM race_info WHERE is_active = true;
      `);

      if (activeRace.rows.length > 0) {
        console.log(`\n✓ Active race: ID ${activeRace.rows[0].id} - ${activeRace.rows[0].race_name}`);
      } else {
        console.log('\n⚠️  No active race found');
      }
    } catch (error) {
      // Column name might not exist, skip this check
    }

    console.log('');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
