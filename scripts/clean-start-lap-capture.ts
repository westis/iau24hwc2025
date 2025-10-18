// Delete all laps and start fresh lap capture
// From now on, scraper will capture laps correctly as they happen
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function cleanStart() {
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

  // Delete ALL laps to start fresh
  const { error } = await supabase
    .from("race_laps")
    .delete()
    .eq("race_id", activeRace.id);

  if (error) {
    console.error("❌ Error deleting laps:", error);
    return;
  }

  console.log(`✅ Deleted all lap records`);
  console.log(`\n✅ Lap capture is now ready to start fresh!`);
  console.log(`\nNext steps:`);
  console.log(`1. The scraper will run every 20 seconds`);
  console.log(`2. When a runner completes a new lap (~1.5km increase), it will be captured`);
  console.log(`3. Each lap will have:`);
  console.log(`   - Cumulative race time AFTER that lap`);
  console.log(`   - Cumulative distance AFTER that lap`);
  console.log(`   - Delta lap time (time for that specific lap)`);
  console.log(`\n4. Later we can backfill historical laps from Breizh Chrono modal HTML`);
}

cleanStart().catch(console.error);
