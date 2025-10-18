// Test pagination directly
import { BreizhChronoAdapter } from "../lib/live-race/breizh-chrono-adapter";

async function test() {
  const adapter = new BreizhChronoAdapter(
    "https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14"
  );

  try {
    console.log("Fetching leaderboard with pagination...");
    const leaderboard = await adapter.fetchLeaderboard();
    console.log(`✅ Success! Fetched ${leaderboard.length} runners`);

    // Show first few entries
    console.log("\nFirst 3 entries:");
    leaderboard.slice(0, 3).forEach(entry => {
      console.log(`  Bib ${entry.bib}: ${entry.name} - ${entry.distanceKm}km, Lap ${entry.lap}`);
    });

    // Show last few entries
    console.log("\nLast 3 entries:");
    leaderboard.slice(-3).forEach(entry => {
      console.log(`  Bib ${entry.bib}: ${entry.name} - ${entry.distanceKm}km, Lap ${entry.lap}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

test();
