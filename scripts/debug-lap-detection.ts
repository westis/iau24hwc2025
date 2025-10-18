// Debug lap detection - check if distances are changing
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function debugLapDetection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!activeRace) {
    console.log("❌ No active race found");
    return;
  }

  // Get top 5 runners from leaderboard
  const { data: topRunners } = await supabase
    .from("race_leaderboard")
    .select("bib, name, lap, distance_km, race_time_sec, last_passing")
    .eq("race_id", activeRace.id)
    .order("rank", { ascending: true })
    .limit(5);

  console.log("\n🏃 Top 5 Runners - Current State:");
  console.log("=".repeat(80));

  topRunners?.forEach((r, i) => {
    console.log(`\n${i + 1}. Bib ${r.bib} - ${r.name}`);
    console.log(`   Lap: ${r.lap}`);
    console.log(`   Distance: ${r.distance_km.toFixed(3)} km`);
    console.log(`   Race Time: ${Math.floor(r.race_time_sec / 3600)}h ${Math.floor((r.race_time_sec % 3600) / 60)}m`);
    console.log(`   Last Passing: ${r.last_passing}`);
  });

  console.log("\n" + "=".repeat(80));

  // Check lap configuration
  const lapConfig = {
    lapDistanceKm: 1.5,
    firstLapDistanceKm: 0.2,
    tolerancePercent: 10,
  };

  console.log("\n⚙️  Lap Configuration:");
  console.log(`   Standard lap distance: ${lapConfig.lapDistanceKm} km`);
  console.log(`   First lap distance: ${lapConfig.firstLapDistanceKm} km`);
  console.log(`   Tolerance: ${lapConfig.tolerancePercent}%`);

  // Calculate expected distance for their current lap number
  console.log("\n📊 Distance Analysis:");
  topRunners?.forEach((r) => {
    const expectedDistance = lapConfig.firstLapDistanceKm + (r.lap - 1) * lapConfig.lapDistanceKm;
    const nextLapThreshold = expectedDistance + lapConfig.lapDistanceKm * 0.9;
    const distanceToNextLap = nextLapThreshold - r.distance_km;

    console.log(`\nBib ${r.bib}:`);
    console.log(`   Expected distance for lap ${r.lap}: ${expectedDistance.toFixed(3)} km`);
    console.log(`   Next lap threshold (90%): ${nextLapThreshold.toFixed(3)} km`);
    console.log(`   Distance to next lap: ${distanceToNextLap.toFixed(3)} km`);
    console.log(`   ${distanceToNextLap <= 0 ? '✅ Should create new lap!' : '⏳ Not yet at next lap'}`);
  });

  // Check if there are any laps in the database
  const { count } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", activeRace.id);

  console.log(`\n\n💾 Laps in database: ${count || 0}`);
}

debugLapDetection().catch(console.error);
