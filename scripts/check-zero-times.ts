// Check if lap times are zeros
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkZeroTimes() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: race } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!race) {
    console.log("❌ No active race found");
    return;
  }

  // Check Bib 191's first 5 laps
  const { data: laps } = await supabase
    .from("race_laps")
    .select("lap, race_time_sec, lap_time_sec, distance_km")
    .eq("race_id", race.id)
    .eq("bib", 191)
    .order("lap", { ascending: true })
    .limit(5);

  console.log("🔍 Bib 191 first 5 laps:");
  laps?.forEach(lap => {
    console.log(`   Lap ${lap.lap}: race_time=${lap.race_time_sec}s, lap_time=${lap.lap_time_sec}s, distance=${lap.distance_km}km`);
  });

  // Check how many laps have zero times
  const { count: zeroRaceTime } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", race.id)
    .eq("race_time_sec", 0);

  const { count: zeroLapTime } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", race.id)
    .eq("lap_time_sec", 0);

  const { count: totalLaps } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", race.id);

  console.log(`\n📊 Statistics:`);
  console.log(`   Total laps: ${totalLaps}`);
  console.log(`   Laps with zero race_time: ${zeroRaceTime} (${((zeroRaceTime! / totalLaps!) * 100).toFixed(1)}%)`);
  console.log(`   Laps with zero lap_time: ${zeroLapTime} (${((zeroLapTime! / totalLaps!) * 100).toFixed(1)}%)`);

  if (zeroRaceTime! > 0) {
    // Get a sample of bibs with zero times
    const { data: zeroBibs } = await supabase
      .from("race_laps")
      .select("bib")
      .eq("race_id", race.id)
      .eq("race_time_sec", 0)
      .limit(10);

    const uniqueBibs = [...new Set(zeroBibs?.map(l => l.bib) || [])];
    console.log(`\n⚠️  Sample bibs with zero times: ${uniqueBibs.join(", ")}`);
  }
}

checkZeroTimes().catch(console.error);
