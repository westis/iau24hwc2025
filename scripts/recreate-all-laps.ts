// Recreate all laps from current leaderboard state
// This manually calculates laps assuming previous state was 0
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { calculateNewLaps } from "../lib/live-race/lap-calculator";

config({ path: resolve(process.cwd(), ".env.local") });

async function recreateAllLaps() {
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

  console.log(`✅ Active race ID: ${activeRace.id}\n`);

  // Get current leaderboard
  const { data: leaderboard } = await supabase
    .from("race_leaderboard")
    .select("*")
    .eq("race_id", activeRace.id)
    .order("rank", { ascending: true });

  if (!leaderboard || leaderboard.length === 0) {
    console.log("❌ No runners in leaderboard");
    return;
  }

  console.log(`Found ${leaderboard.length} runners in leaderboard\n`);

  const lapConfig = {
    lapDistanceKm: 1.5,
    firstLapDistanceKm: 0.2,
    tolerancePercent: 10,
  };

  const allLaps: any[] = [];
  let runnersProcessed = 0;

  for (const runner of leaderboard) {
    // Calculate laps from 0 to current distance
    const result = calculateNewLaps(
      runner.bib,
      runner.distance_km,
      0, // previous distance = 0 (start from beginning)
      runner.race_time_sec,
      0, // previous race time = 0
      0, // previous lap = 0 (start from beginning)
      lapConfig
    );

    if (result.newLaps.length > 0) {
      allLaps.push(...result.newLaps);
      runnersProcessed++;

      if (runnersProcessed <= 5) {
        console.log(
          `Runner ${runner.bib} (${runner.name}): Created ${result.newLaps.length} laps`
        );
      }
    }
  }

  console.log(`\n✅ Calculated ${allLaps.length} total laps for ${runnersProcessed} runners`);

  // Insert laps into database
  const lapsWithRaceId = allLaps.map((lap) => ({
    race_id: activeRace.id,
    bib: lap.bib,
    lap: lap.lap,
    lap_time_sec: lap.lapTimeSec,
    race_time_sec: lap.raceTimeSec,
    distance_km: lap.distanceKm,
    rank: lap.rank || null,
    gender_rank: lap.genderRank || null,
    age_group_rank: lap.ageGroupRank || null,
    lap_pace: lap.lapPace,
    avg_pace: lap.avgPace,
    timestamp: lap.timestamp,
  }));

  console.log(`\nInserting laps into database...`);

  const { data, error } = await supabase
    .from("race_laps")
    .insert(lapsWithRaceId);

  if (error) {
    console.error("❌ Error inserting laps:", error);
    return;
  }

  console.log(`✅ Successfully inserted ${allLaps.length} laps!`);
}

recreateAllLaps().catch(console.error);
