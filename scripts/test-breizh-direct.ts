// Quick test to see what Breizh Chrono returns
import { BreizhChronoAdapter } from "../lib/live-race/breizh-chrono-adapter";

const URL = "https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14";

async function test() {
  console.log("Testing Breizh Chrono scraper...");
  console.log("URL:", URL);
  console.log("");

  try {
    const adapter = new BreizhChronoAdapter(URL);

    console.log("Fetching leaderboard...");
    const leaderboard = await adapter.fetchLeaderboard();

    console.log(`Found ${leaderboard.length} runners`);
    console.log("");

    if (leaderboard.length > 0) {
      console.log("First 5 runners:");
      leaderboard.slice(0, 5).forEach((runner, i) => {
        console.log(`${i + 1}. Bib ${runner.bib}: ${runner.name} - ${runner.distanceKm}km`);
      });
    } else {
      console.log("❌ NO RUNNERS FOUND!");
      console.log("The HTML parser might not be working with this format.");
    }
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

test();
