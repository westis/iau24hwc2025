// Check specific bibs for zero times
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkBibs() {
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

  const bibsToCheck = [212, 94, 191];

  for (const bib of bibsToCheck) {
    console.log(`\n🔍 Checking Bib ${bib}:`);

    const { data: laps, count } = await supabase
      .from("race_laps")
      .select("lap, race_time_sec, lap_time_sec, distance_km", { count: "exact" })
      .eq("race_id", race.id)
      .eq("bib", bib)
      .order("lap", { ascending: true })
      .limit(5);

    if (!laps || laps.length === 0) {
      console.log(`   ❌ No laps found in database`);
      continue;
    }

    console.log(`   Total laps: ${count}`);
    console.log(`   First 5 laps:`);
    laps.forEach(lap => {
      console.log(`      Lap ${lap.lap}: race_time=${lap.race_time_sec}s, lap_time=${lap.lap_time_sec}s, distance=${lap.distance_km}km`);
    });

    // Count zeros
    const { count: zeroRaceTime } = await supabase
      .from("race_laps")
      .select("*", { count: "exact", head: true })
      .eq("race_id", race.id)
      .eq("bib", bib)
      .eq("race_time_sec", 0);

    const { count: zeroLapTime } = await supabase
      .from("race_laps")
      .select("*", { count: "exact", head: true })
      .eq("race_id", race.id)
      .eq("bib", bib)
      .eq("lap_time_sec", 0);

    console.log(`   Laps with zero race_time: ${zeroRaceTime}/${count}`);
    console.log(`   Laps with zero lap_time: ${zeroLapTime}/${count}`);
  }
}

checkBibs().catch(console.error);
