// Check lap pace values in database
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkLapPace() {
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

  // Get laps 44-46 for bib 191
  const { data: laps } = await supabase
    .from("race_laps")
    .select("*")
    .eq("race_id", activeRace.id)
    .eq("bib", 191)
    .gte("lap", 44)
    .lte("lap", 46)
    .order("lap", { ascending: true });

  console.log(`📊 Laps 44-46 for Bib 191:\n`);

  if (laps && laps.length > 0) {
    laps.forEach((lap, index) => {
      // Calculate lap distance
      let lapDistance = 0;
      if (index > 0) {
        lapDistance = lap.distance_km - laps[index - 1].distance_km;
      } else {
        // For first lap in this range, fetch previous lap
        console.log(`Lap ${lap.lap}:`);
        console.log(`  Total distance: ${lap.distance_km} km`);
        console.log(`  Lap time: ${lap.lap_time_sec}s (${Math.floor(lap.lap_time_sec/60)}:${String(lap.lap_time_sec%60).padStart(2, '0')})`);
        console.log(`  Race time: ${lap.race_time_sec}s (${Math.floor(lap.race_time_sec/3600)}:${String(Math.floor((lap.race_time_sec%3600)/60)).padStart(2, '0')}:${String(lap.race_time_sec%60).padStart(2, '0')})`);
        console.log(`  Lap pace: ${lap.lap_pace}s/km (${Math.floor(lap.lap_pace/60)}:${String(Math.floor(lap.lap_pace%60)).padStart(2, '0')}/km)`);
        console.log(`  Avg pace: ${lap.avg_pace}s/km (${Math.floor(lap.avg_pace/60)}:${String(Math.floor(lap.avg_pace%60)).padStart(2, '0')}/km)`);
        console.log();
        return;
      }

      console.log(`Lap ${lap.lap}:`);
      console.log(`  Total distance: ${lap.distance_km} km`);
      console.log(`  Lap distance: ${lapDistance.toFixed(3)} km`);
      console.log(`  Lap time: ${lap.lap_time_sec}s (${Math.floor(lap.lap_time_sec/60)}:${String(lap.lap_time_sec%60).padStart(2, '0')})`);
      console.log(`  Race time: ${lap.race_time_sec}s (${Math.floor(lap.race_time_sec/3600)}:${String(Math.floor((lap.race_time_sec%3600)/60)).padStart(2, '0')}:${String(lap.race_time_sec%60).padStart(2, '0')})`);
      console.log(`  Lap pace (DB): ${lap.lap_pace.toFixed(2)}s/km (${Math.floor(lap.lap_pace/60)}:${String(Math.floor(lap.lap_pace%60)).padStart(2, '0')}/km)`);
      console.log(`  Lap pace (calculated): ${(lap.lap_time_sec / lapDistance).toFixed(2)}s/km`);
      console.log(`  Avg pace: ${lap.avg_pace.toFixed(2)}s/km (${Math.floor(lap.avg_pace/60)}:${String(Math.floor(lap.avg_pace%60)).padStart(2, '0')}/km)`);
      console.log();
    });
  } else {
    console.log("❌ No laps found");
  }
}

checkLapPace().catch(console.error);
