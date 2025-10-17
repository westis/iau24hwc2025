#!/usr/bin/env tsx
/**
 * Clear Simulation Data
 *
 * This script safely removes all mock/simulation data from the database
 * while preserving real race data.
 *
 * Safety Features:
 * 1. Only clears data when simulation_mode is enabled
 * 2. Uses simulation_start_time to identify simulation data
 * 3. Provides detailed confirmation before deletion
 * 4. Preserves runner information and race configuration
 * 5. Never deletes real timing data from actual races
 *
 * Usage:
 *   npm run clear-sim-data [--force]
 *
 * Examples:
 *   npm run clear-sim-data          # Interactive mode with confirmation
 *   npm run clear-sim-data --force  # Skip confirmation (use with caution)
 */

import * as readline from "readline";

const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const FORCE_MODE = process.argv.includes("--force");

interface RaceConfig {
  id: number;
  race_id: number;
  simulation_mode: boolean;
  simulation_start_time?: string;
  current_race_time_sec: number;
  race_state: string;
}

interface ClearStats {
  lapsDeleted: number;
  leaderboardDeleted: number;
  updatesDeleted: number;
  simulationModeDisabled: boolean;
}

async function fetchRaceConfig(): Promise<RaceConfig> {
  const res = await fetch(`${API_URL}/api/race/config`);
  if (!res.ok) {
    throw new Error(`Failed to fetch race config: ${res.statusText}`);
  }
  return await res.json();
}

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

async function clearSimulationData(
  config: RaceConfig
): Promise<ClearStats> {
  const stats: ClearStats = {
    lapsDeleted: 0,
    leaderboardDeleted: 0,
    updatesDeleted: 0,
    simulationModeDisabled: false,
  };

  // Clear simulation data via API
  const clearRes = await fetch(`${API_URL}/api/race/clear-simulation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raceId: config.race_id,
      simulationStartTime: config.simulation_start_time,
    }),
  });

  if (!clearRes.ok) {
    throw new Error(`Failed to clear simulation data: ${clearRes.statusText}`);
  }

  const result = await clearRes.json();
  stats.lapsDeleted = result.lapsDeleted || 0;
  stats.leaderboardDeleted = result.leaderboardDeleted || 0;
  stats.updatesDeleted = result.updatesDeleted || 0;

  // Disable simulation mode and reset race state
  const configRes = await fetch(`${API_URL}/api/race/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      simulationMode: false,
      currentRaceTimeSec: 0,
      simulationStartTime: null,
    }),
  });

  if (!configRes.ok) {
    throw new Error(`Failed to update race config: ${configRes.statusText}`);
  }

  stats.simulationModeDisabled = true;

  return stats;
}

async function main() {
  console.log("\n🧹 Clear Simulation Data\n");
  console.log("=" .repeat(70));

  try {
    // Step 1: Fetch current race config
    console.log("\n📊 Fetching race configuration...");
    const config = await fetchRaceConfig();

    // Step 2: Safety check - only proceed if simulation mode is enabled
    if (!config.simulation_mode) {
      console.log("\n⚠️  SAFETY CHECK PASSED");
      console.log("✅ Simulation mode is NOT enabled");
      console.log("✅ No simulation data to clear");
      console.log("✅ Real race data is safe\n");
      return;
    }

    // Step 3: Display current simulation state
    console.log("\n⚠️  SIMULATION MODE DETECTED");
    console.log("─".repeat(70));
    console.log(`   Simulation Mode: ${config.simulation_mode ? "ENABLED" : "DISABLED"}`);
    console.log(`   Race State: ${config.race_state}`);
    console.log(
      `   Simulation Start: ${
        config.simulation_start_time
          ? new Date(config.simulation_start_time).toLocaleString()
          : "Not set"
      }`
    );
    console.log(
      `   Current Race Time: ${Math.floor(config.current_race_time_sec / 3600)}h ${Math.floor((config.current_race_time_sec % 3600) / 60)}m`
    );
    console.log("─".repeat(70));

    // Step 4: Explain what will be cleared
    console.log("\n📝 The following simulation data will be CLEARED:");
    console.log("   ✓ All lap times created during simulation");
    console.log("   ✓ All leaderboard entries from simulation");
    console.log("   ✓ All race updates generated during simulation");
    console.log("   ✓ Simulation mode flag (will be disabled)");
    console.log("   ✓ Current race time (will be reset to 0)");

    console.log("\n🛡️  The following data will be PRESERVED:");
    console.log("   ✓ All runner information");
    console.log("   ✓ Race configuration (course, distance, etc.)");
    console.log("   ✓ Any real race data (if exists)");
    console.log("   ✓ Teams, news, and other non-race data");

    // Step 5: Request confirmation
    console.log("\n");
    const confirmed = await promptConfirmation(
      "⚠️  Are you sure you want to clear all simulation data?"
    );

    if (!confirmed) {
      console.log("\n❌ Operation cancelled by user\n");
      return;
    }

    // Step 6: Clear simulation data
    console.log("\n🗑️  Clearing simulation data...\n");
    const stats = await clearSimulationData(config);

    // Step 7: Display results
    console.log("\n" + "=".repeat(70));
    console.log("✅ SIMULATION DATA CLEARED SUCCESSFULLY");
    console.log("=".repeat(70));
    console.log("\n📊 Summary:");
    console.log(`   • Lap records deleted: ${stats.lapsDeleted}`);
    console.log(`   • Leaderboard entries deleted: ${stats.leaderboardDeleted}`);
    console.log(`   • Race updates deleted: ${stats.updatesDeleted}`);
    console.log(
      `   • Simulation mode: ${stats.simulationModeDisabled ? "DISABLED" : "STILL ENABLED"}`
    );
    console.log(`   • Race clock: RESET to 0`);
    console.log(`   • Orange banner: REMOVED`);

    console.log("\n🛡️  Real Data Safety:");
    console.log("   ✓ All runner information preserved");
    console.log("   ✓ Race configuration preserved");
    console.log("   ✓ Real race data (if any) preserved");

    console.log(`\n🌐 View at: ${API_URL}/live\n`);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.log("\nPossible solutions:");
    console.log("   • Make sure your Next.js dev server is running (npm run dev)");
    console.log("   • Check your database connection");
    console.log("   • Verify the API endpoint exists");
    console.log("");
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⏹️  Operation cancelled by user\n");
  process.exit(0);
});

main();
