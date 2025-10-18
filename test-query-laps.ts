// Quick test to check what race_id we're using and if laps exist
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get active race
  const { data: activeRace, error: raceError } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  console.log("Active race:", activeRace, raceError);

  if (activeRace) {
    // Get lap count for this race
    const { data: laps, error: lapsError, count } = await supabase
      .from("race_laps")
      .select("*", { count: "exact" })
      .eq("race_id", activeRace.id);

    console.log(`\nRace ID ${activeRace.id} has ${count} total laps`);
    if (lapsError) console.error("Laps error:", lapsError);

    // Check specific bibs from the debug samples
    for (const bib of [193, 212, 68, 191]) {
      const { data: bibLaps } = await supabase
        .from("race_laps")
        .select("bib, lap, race_time_sec")
        .eq("race_id", activeRace.id)
        .eq("bib", bib)
        .order("lap", { ascending: false })
        .limit(3);

      console.log(`\nBib ${bib} latest laps:`, bibLaps);
    }
  }
}

test().catch(console.error);
