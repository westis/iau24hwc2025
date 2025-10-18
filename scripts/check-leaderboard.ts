// Check what's in the leaderboard table
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkLeaderboard() {
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

  console.log(`✅ Active race ID: ${activeRace.id}\n`);

  // Get leaderboard data
  const { data: leaderboard, error } = await supabase
    .from("race_leaderboard")
    .select("*")
    .eq("race_id", activeRace.id)
    .order("rank", { ascending: true })
    .limit(5);

  if (error) {
    console.log(`❌ Error fetching leaderboard: ${error.message}`);
    return;
  }

  console.log(`📊 Total runners in leaderboard: ${leaderboard?.length || 0}\n`);

  if (leaderboard && leaderboard.length > 0) {
    console.log("Top 5 runners:");
    leaderboard.forEach((runner) => {
      console.log(`  ${runner.rank}. Bib ${runner.bib} - ${runner.name || 'NO NAME'} (${runner.country || 'NO COUNTRY'}) - ${runner.gender || 'NO GENDER'}`);
      console.log(`     Distance: ${runner.distance_km} km, Lap: ${runner.lap}`);
    });
  } else {
    console.log("❌ No runners in leaderboard!");
  }

  // Check total count
  const { count } = await supabase
    .from("race_leaderboard")
    .select("*", { count: "exact", head: true })
    .eq("race_id", activeRace.id);

  console.log(`\n📈 Total runners in database: ${count}`);
}

checkLeaderboard().catch(console.error);
