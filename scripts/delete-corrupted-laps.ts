// Delete corrupted lap data so the scraper can recalculate from current state
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function deleteCorruptedLaps() {
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

  console.log(`Active race ID: ${activeRace.id}`);

  // Count existing laps
  const { count: beforeCount } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", activeRace.id);

  console.log(`\nFound ${beforeCount} existing lap records`);

  // Delete all corrupted laps (those with race_time_sec = 0)
  const { data, error } = await supabase
    .from("race_laps")
    .delete()
    .eq("race_id", activeRace.id)
    .eq("race_time_sec", 0);

  if (error) {
    console.error("❌ Error deleting laps:", error);
    return;
  }

  console.log(`✅ Deleted all corrupted laps (race_time_sec = 0)`);
  console.log(`\nNext step: Run the scraper to recalculate all laps from current leaderboard state`);
  console.log(`Command: npm run scrape`);
}

deleteCorruptedLaps().catch(console.error);
