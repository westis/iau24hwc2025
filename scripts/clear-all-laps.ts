// Clear all laps from the database
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function clearAllLaps() {
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

  console.log(`🗑️  Clearing all laps for race ID ${activeRace.id}...`);

  const { error } = await supabase
    .from("race_laps")
    .delete()
    .eq("race_id", activeRace.id);

  if (error) {
    console.error("❌ Error clearing laps:", error);
    return;
  }

  const { count } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", activeRace.id);

  console.log(`✅ All laps cleared! Remaining laps: ${count || 0}`);
  console.log(`\nNow run: npx tsx scripts/puppeteer-backfill-laps.ts`);
}

clearAllLaps().catch(console.error);
