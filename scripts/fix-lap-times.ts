// Fix lap times by calculating them proportionally from current leaderboard state
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function fixLapTimes() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id, start_date")
    .eq("is_active", true)
    .single();

  if (!activeRace) {
    console.log("❌ No active race found");
    return;
  }

  console.log(`✅ Active race ID: ${activeRace.id}`);
  console.log(`📅 Race start: ${activeRace.start_date}\n`);

  const raceStartTime = new Date(activeRace.start_date).getTime();

  // Get current leaderboard with race times
  const { data: leaderboard } = await supabase
    .from("race_leaderboard")
    .select("bib, distance_km, last_passing")
    .eq("race_id", activeRace.id);

  if (!leaderboard || leaderboard.length === 0) {
    console.log("❌ No leaderboard data found");
    return;
  }

  console.log(`📊 Found ${leaderboard.length} runners in leaderboard\n`);

  let runnersProcessed = 0;
  let lapsUpdated = 0;

  // Process each runner
  for (const runner of leaderboard) {
    // Calculate runner's current race time
    if (!runner.last_passing) {
      console.log(`⚠️  Bib ${runner.bib}: No last_passing timestamp, skipping`);
      continue;
    }

    const lastPassingTime = new Date(runner.last_passing).getTime();
    const totalRaceTimeSec = Math.floor((lastPassingTime - raceStartTime) / 1000);

    // Get all laps for this runner
    const { data: laps } = await supabase
      .from("race_laps")
      .select("lap, distance_km")
      .eq("race_id", activeRace.id)
      .eq("bib", runner.bib)
      .order("lap", { ascending: true });

    if (!laps || laps.length === 0) {
      continue;
    }

    // Calculate proportional times for each lap
    const updates = laps.map((lap, index) => {
      // Calculate what percentage of total distance this lap represents
      const lapRaceTimeSec = Math.floor((lap.distance_km / runner.distance_km) * totalRaceTimeSec);

      // Calculate lap time (time difference from previous lap)
      let lapTimeSec: number;
      if (index === 0) {
        lapTimeSec = lapRaceTimeSec;
      } else {
        const prevLap = laps[index - 1];
        const prevRaceTimeSec = Math.floor((prevLap.distance_km / runner.distance_km) * totalRaceTimeSec);
        lapTimeSec = lapRaceTimeSec - prevRaceTimeSec;
      }

      // Calculate paces
      const lapPace = lapTimeSec > 0 && lap.distance_km > 0 ? lapTimeSec / lap.distance_km : 0;
      const avgPace = lapRaceTimeSec > 0 && lap.distance_km > 0 ? lapRaceTimeSec / lap.distance_km : 0;

      return {
        race_id: activeRace.id,
        bib: runner.bib,
        lap: lap.lap,
        race_time_sec: lapRaceTimeSec,
        lap_time_sec: lapTimeSec,
        lap_pace: lapPace,
        avg_pace: avgPace,
      };
    });

    // Update database
    for (const update of updates) {
      const { error } = await supabase
        .from("race_laps")
        .update({
          race_time_sec: update.race_time_sec,
          lap_time_sec: update.lap_time_sec,
          lap_pace: update.lap_pace,
          avg_pace: update.avg_pace,
        })
        .eq("race_id", update.race_id)
        .eq("bib", update.bib)
        .eq("lap", update.lap);

      if (error) {
        console.error(`❌ Error updating bib ${runner.bib} lap ${update.lap}:`, error);
      } else {
        lapsUpdated++;
      }
    }

    runnersProcessed++;
    if (runnersProcessed <= 10) {
      console.log(`✅ Bib ${runner.bib}: Updated ${laps.length} laps (total race time: ${Math.floor(totalRaceTimeSec/60)}m)`);
    } else if (runnersProcessed % 50 === 0) {
      console.log(`   ... processed ${runnersProcessed} runners, ${lapsUpdated} laps updated`);
    }
  }

  console.log(`\n🎉 Successfully updated ${lapsUpdated} laps for ${runnersProcessed} runners!`);
}

fixLapTimes().catch(console.error);
