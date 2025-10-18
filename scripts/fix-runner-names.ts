// Fix runner names with proper HTML entity decoding
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { BreizhChronoAdapter } from "../lib/live-race/breizh-chrono-adapter";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function fixRunnerNames() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const breizhUrl = process.env.BREIZH_CHRONO_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  if (!breizhUrl) {
    console.error("Missing BREIZH_CHRONO_URL");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching fresh data from Breizh Chrono with proper encoding...\n");

  // Fetch fresh data with the fixed decoder
  const adapter = new BreizhChronoAdapter(breizhUrl);
  const leaderboard = await adapter.fetchLeaderboard();

  console.log(`✅ Fetched ${leaderboard.length} runners\n`);

  // Get active race
  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!activeRace) {
    console.error("No active race found");
    process.exit(1);
  }

  console.log(`Updating names in database for race ${activeRace.id}...\n`);

  let updated = 0;
  let unchanged = 0;

  for (const entry of leaderboard) {
    // Get current name from database
    const { data: current } = await supabase
      .from("race_leaderboard")
      .select("name")
      .eq("race_id", activeRace.id)
      .eq("bib", entry.bib)
      .single();

    if (current && current.name !== entry.name) {
      console.log(`Bib ${entry.bib}: "${current.name}" -> "${entry.name}"`);

      // Update the name
      await supabase
        .from("race_leaderboard")
        .update({ name: entry.name })
        .eq("race_id", activeRace.id)
        .eq("bib", entry.bib);

      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n✅ Updated ${updated} names`);
  console.log(`   Unchanged: ${unchanged}`);
}

fixRunnerNames().catch(console.error);
