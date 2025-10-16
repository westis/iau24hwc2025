#!/usr/bin/env tsx
/**
 * Debug script to check simulation mode status
 */

const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function checkSimulationMode() {
  console.log("\n🔍 Checking Simulation Mode Status...\n");

  try {
    // Check race config
    console.log("1. Fetching race config from API...");
    const configRes = await fetch(`${API_URL}/api/race/config`);
    
    if (!configRes.ok) {
      console.log(`❌ API Error: ${configRes.status} ${configRes.statusText}`);
      return;
    }

    const config = await configRes.json();
    
    console.log("\n📊 Race Config:");
    console.log("─".repeat(50));
    console.log(`Race State: ${config.race_state || "NOT SET"}`);
    console.log(`Simulation Mode: ${config.simulation_mode ? "✅ ON" : "❌ OFF"}`);
    console.log(`Current Race Time: ${config.current_race_time_sec || 0} seconds`);
    console.log(`Simulation Start: ${config.simulation_start_time || "NOT SET"}`);
    console.log("─".repeat(50));

    // Check leaderboard
    console.log("\n2. Fetching leaderboard...");
    const leaderboardRes = await fetch(`${API_URL}/api/race/leaderboard?filter=overall`);
    
    if (leaderboardRes.ok) {
      const leaderboard = await leaderboardRes.json();
      console.log(`✅ Leaderboard OK: ${leaderboard.entries?.length || 0} runners`);
    } else {
      console.log(`❌ Leaderboard Error: ${leaderboardRes.status}`);
    }

    // Diagnosis
    console.log("\n💡 Diagnosis:");
    console.log("─".repeat(50));
    
    if (!config.simulation_mode) {
      console.log("❌ Simulation Mode is OFF");
      console.log("\nTo turn it ON:");
      console.log("1. Run: npm run simulate-live");
      console.log("   OR");
      console.log("2. Run this curl command:");
      console.log(`   curl -X PATCH ${API_URL}/api/race/config \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"simulationMode": true, "currentRaceTimeSec": 0}'`);
    } else {
      console.log("✅ Simulation Mode is ON!");
      console.log("\nThe orange banner should appear at:");
      console.log(`   ${API_URL}/live`);
      console.log("\nIf you don't see it:");
      console.log("   1. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)");
      console.log("   2. Clear browser cache");
      console.log("   3. Check browser console (F12) for errors");
    }
    
    console.log("─".repeat(50));
    console.log();

  } catch (error) {
    console.error("\n❌ Error:", error);
    console.log("\n💡 Make sure your dev server is running:");
    console.log("   npm run dev");
  }
}

checkSimulationMode();

export {};


