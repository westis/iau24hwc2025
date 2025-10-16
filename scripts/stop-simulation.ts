#!/usr/bin/env tsx
/**
 * Stop Simulation Mode
 *
 * This script disables simulation mode and removes the orange banner
 * from the live race pages.
 */

async function stopSimulation() {
  const API_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  console.log("\n🛑 Stopping Simulation Mode...\n");

  try {
    const res = await fetch(`${API_URL}/api/race/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulationMode: false,
        currentRaceTimeSec: 0,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update config: ${res.statusText}`);
    }

    console.log("✅ Simulation mode disabled");
    console.log("✅ Orange banner removed");
    console.log("✅ Race clock reset\n");
    console.log(`🌐 View at: ${API_URL}/live\n`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log(
      "\nMake sure your Next.js dev server is running (npm run dev)\n"
    );
    process.exit(1);
  }
}

stopSimulation();
