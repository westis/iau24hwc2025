// Check what lap data is actually in the database
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function checkLapData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get active race
  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!activeRace) {
    console.log("❌ No active race found");
    return;
  }

  console.log(`✅ Active race ID: ${activeRace.id}\n`);

  // Get a runner from leaderboard
  const { data: topRunner } = await supabase
    .from("race_leaderboard")
    .select("bib, name, lap, distance_km, race_time_sec, last_passing, lap_time_sec, lap_pace_sec")
    .eq("race_id", activeRace.id)
    .order("rank", { ascending: true })
    .limit(1)
    .single();

  if (!topRunner) {
    console.log("❌ No runners in leaderboard");
    return;
  }

  console.log(`Top runner: Bib ${topRunner.bib} - ${topRunner.name}`);
  console.log(`  Current lap: ${topRunner.lap}`);
  console.log(`  Distance: ${topRunner.distance_km} km`);
  console.log(`  Race time: ${topRunner.race_time_sec} sec`);
  console.log(`  Last passing: ${topRunner.last_passing}`);
  console.log(`  Lap time: ${topRunner.lap_time_sec} sec`);
  console.log(`  Lap pace: ${topRunner.lap_pace_sec} sec/km\n`);

  // Get lap data for this runner
  const { data: laps } = await supabase
    .from("race_laps")
    .select("*")
    .eq("race_id", activeRace.id)
    .eq("bib", topRunner.bib)
    .order("lap", { ascending: true });

  console.log(`Found ${laps?.length || 0} laps in race_laps table\n`);

  if (laps && laps.length > 0) {
    console.log("First 3 laps:");
    laps.slice(0, 3).forEach((lap) => {
      console.log(`  Lap ${lap.lap}:`);
      console.log(`    lap_time_sec: ${lap.lap_time_sec}`);
      console.log(`    race_time_sec: ${lap.race_time_sec}`);
      console.log(`    distance_km: ${lap.distance_km}`);
      console.log(`    lap_pace: ${lap.lap_pace}`);
      console.log(`    avg_pace: ${lap.avg_pace}`);
    });

    console.log(`\n...`);

    console.log(`\nLast lap (Lap ${laps[laps.length - 1].lap}):`);
    const lastLap = laps[laps.length - 1];
    console.log(`  lap_time_sec: ${lastLap.lap_time_sec}`);
    console.log(`  race_time_sec: ${lastLap.race_time_sec}`);
    console.log(`  distance_km: ${lastLap.distance_km}`);
    console.log(`  lap_pace: ${lastLap.lap_pace}`);
    console.log(`  avg_pace: ${lastLap.avg_pace}`);

    console.log(`\n✅ Laps go up to lap ${laps[laps.length - 1].lap}`);
    console.log(`❓ Leaderboard shows lap ${topRunner.lap}`);

    if (laps[laps.length - 1].lap < topRunner.lap) {
      console.log(
        `\n⚠️  MISMATCH: race_laps has ${laps.length} laps but leaderboard shows lap ${topRunner.lap}`
      );
      console.log(
        `   Missing laps: ${laps[laps.length - 1].lap + 1} to ${topRunner.lap}`
      );
    }
  } else {
    console.log("❌ No lap data found in race_laps table!");
    console.log(`   But leaderboard shows this runner is on lap ${topRunner.lap}`);
  }
}

checkLapData().catch(console.error);
