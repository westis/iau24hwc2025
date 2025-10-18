// Check actual lap time values in database
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkLapTimesInDb() {
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

  // Get laps for bib 191 (race leader)
  const { data: laps } = await supabase
    .from("race_laps")
    .select("*")
    .eq("race_id", activeRace.id)
    .eq("bib", 191)
    .order("lap", { ascending: true })
    .limit(5);

  console.log(`📊 First 5 laps for Bib 191 from database:\n`);

  if (laps && laps.length > 0) {
    laps.forEach((lap) => {
      console.log(`Lap ${lap.lap}:`);
      console.log(`  race_time_sec: ${lap.race_time_sec}`);
      console.log(`  lap_time_sec: ${lap.lap_time_sec}`);
      console.log(`  distance_km: ${lap.distance_km}`);
      console.log(`  timestamp: ${lap.timestamp}`);
      console.log();
    });
  } else {
    console.log("❌ No laps found for bib 191");
  }

  // Check total laps with non-zero times
  const { data: nonZeroLaps } = await supabase
    .from("race_laps")
    .select("bib, lap, race_time_sec, lap_time_sec")
    .eq("race_id", activeRace.id)
    .gt("race_time_sec", 0)
    .limit(10);

  console.log(`\n✅ Sample laps with NON-ZERO race_time_sec:\n`);
  if (nonZeroLaps && nonZeroLaps.length > 0) {
    nonZeroLaps.forEach((lap) => {
      console.log(`  Bib ${lap.bib} Lap ${lap.lap}: race_time=${lap.race_time_sec}s, lap_time=${lap.lap_time_sec}s`);
    });
  } else {
    console.log("  ❌ NO laps have non-zero race_time_sec!");
  }
}

checkLapTimesInDb().catch(console.error);
