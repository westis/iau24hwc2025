// Sync runner names from runners table to race_leaderboard
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function syncNamesFromRunners() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching runners from database...\n");

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

  // Get all runners with their correct names
  const { data: runners, error: runnersError } = await supabase
    .from("runners")
    .select("bib, firstname, lastname");

  if (runnersError) {
    console.error("Error fetching runners:", runnersError);
    process.exit(1);
  }

  if (!runners || runners.length === 0) {
    console.error("No runners found in database");
    process.exit(1);
  }

  // Filter only runners with bib numbers
  const runnersWithBib = runners.filter(r => r.bib !== null);

  if (runnersWithBib.length === 0) {
    console.error("No runners with bib numbers found");
    process.exit(1);
  }

  console.log(`✅ Found ${runners.length} runners in database (${runnersWithBib.length} with bib numbers)\n`);
  console.log(`Updating names in race_leaderboard for race ${activeRace.id}...\n`);

  let updated = 0;
  let notFound = 0;

  for (const runner of runnersWithBib) {
    const correctName = `${runner.firstname} ${runner.lastname}`.trim();

    // Get current name from leaderboard
    const { data: current } = await supabase
      .from("race_leaderboard")
      .select("name")
      .eq("race_id", activeRace.id)
      .eq("bib", runner.bib)
      .single();

    if (!current) {
      notFound++;
      continue;
    }

    if (current.name !== correctName) {
      console.log(`Bib ${runner.bib}: "${current.name}" -> "${correctName}"`);

      // Update the name
      const { error } = await supabase
        .from("race_leaderboard")
        .update({ name: correctName })
        .eq("race_id", activeRace.id)
        .eq("bib", runner.bib);

      if (error) {
        console.error(`Error updating bib ${runner.bib}:`, error);
      } else {
        updated++;
      }
    }
  }

  console.log(`\n✅ Updated ${updated} names`);
  console.log(`   Not in leaderboard: ${notFound}`);
  console.log(`\nDone! Refresh your browser to see the correct names.`);
}

syncNamesFromRunners().catch(console.error);
