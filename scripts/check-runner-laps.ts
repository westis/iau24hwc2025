// Check specific runner's laps
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkRunnerLaps() {
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

  // Check bib 191 (leader)
  const { data: laps } = await supabase
    .from("race_laps")
    .select("*")
    .eq("race_id", activeRace.id)
    .eq("bib", 191)
    .order("lap", { ascending: true });

  console.log(`\n🏃 Bib 191 - Laps in database: ${laps?.length || 0}\n`);

  if (laps && laps.length > 0) {
    console.log("First 3 laps:");
    laps.slice(0, 3).forEach(lap => {
      console.log(`  Lap ${lap.lap}: ${lap.distance_km.toFixed(3)} km, ${Math.floor(lap.race_time_sec/60)}m ${lap.race_time_sec%60}s`);
    });

    console.log("\nLast 3 laps:");
    laps.slice(-3).forEach(lap => {
      console.log(`  Lap ${lap.lap}: ${lap.distance_km.toFixed(3)} km, ${Math.floor(lap.race_time_sec/60)}m ${lap.race_time_sec%60}s`);
    });
  }

  // Check leaderboard
  const { data: leaderboard } = await supabase
    .from("race_leaderboard")
    .select("*")
    .eq("race_id", activeRace.id)
    .eq("bib", 191)
    .single();

  console.log(`\n📊 Leaderboard state:`);
  console.log(`   Current lap: ${leaderboard?.lap}`);
  console.log(`   Distance: ${leaderboard?.distance_km.toFixed(3)} km`);
  console.log(`   Last passing: ${leaderboard?.last_passing}`);
}

checkRunnerLaps().catch(console.error);
