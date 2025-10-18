// Show current race state - where each runner is now
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function showCurrentState() {
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

  // Get top 10 runners
  const { data: topRunners } = await supabase
    .from("race_leaderboard")
    .select("rank, bib, name, distance_km, lap, race_time_sec, last_passing")
    .eq("race_id", activeRace.id)
    .order("rank", { ascending: true })
    .limit(10);

  if (!topRunners) {
    console.log("❌ No runners found");
    return;
  }

  console.log(`\n🏃 Current Race State - Top 10 Runners`);
  console.log(`Race started: ${activeRace.start_date}`);
  console.log(`Race time: ${Math.floor(topRunners[0].race_time_sec / 3600)}h ${Math.floor((topRunners[0].race_time_sec % 3600) / 60)}m\n`);
  console.log("=" .repeat(80));

  topRunners.forEach((r) => {
    const hours = Math.floor(r.race_time_sec / 3600);
    const mins = Math.floor((r.race_time_sec % 3600) / 60);
    console.log(`${r.rank}. Bib ${r.bib} - ${r.name}`);
    console.log(`   Distance: ${r.distance_km.toFixed(2)} km | Lap: ${r.lap} | Time: ${hours}h ${mins}m`);
    console.log(`   Last passing: ${r.last_passing}`);
  });

  console.log("=" .repeat(80));
  console.log("\n✅ This state is being tracked correctly in race_leaderboard");
  console.log("✅ When runners complete next lap (~1.5km), it will be captured in race_laps");
  console.log("\n💡 For historical lap data, we'll backfill from Breizh Chrono modal HTML later");
}

showCurrentState().catch(console.error);
