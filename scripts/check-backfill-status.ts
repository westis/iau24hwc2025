// Check backfill status and missing runners
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkStatus() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: race } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!race) {
    console.log("❌ No active race found");
    return;
  }

  // Get total laps
  const { count: totalLaps } = await supabase
    .from("race_laps")
    .select("*", { count: "exact", head: true })
    .eq("race_id", race.id);

  // Get unique runners with lap data
  const { data: uniqueRunners } = await supabase
    .from("race_laps")
    .select("bib")
    .eq("race_id", race.id);

  const uniqueBibs = new Set(uniqueRunners?.map(r => r.bib) || []);

  // Check specific failed bibs
  const failedBibs = [255, 27, 192, 185, 403, 153, 182, 5, 224, 127];
  const missingBibs: number[] = [];

  console.log("🔍 Checking failed bibs...\n");

  for (const bib of failedBibs) {
    const { count } = await supabase
      .from("race_laps")
      .select("*", { count: "exact", head: true })
      .eq("race_id", race.id)
      .eq("bib", bib);

    if (!count || count === 0) {
      missingBibs.push(bib);
      console.log(`   Bib ${bib}: ❌ No laps in database`);
    } else {
      console.log(`   Bib ${bib}: ✅ ${count} laps`);
    }
  }

  console.log(`\n📊 Database Status:`);
  console.log(`   Total laps: ${totalLaps}`);
  console.log(`   Unique runners with data: ${uniqueBibs.size}/366`);
  console.log(`   Missing runners: ${366 - uniqueBibs.size}`);

  if (missingBibs.length > 0) {
    console.log(`\n⚠️  Bibs with no laps in DB: ${missingBibs.join(", ")}`);
    console.log(`\nTo backfill these individually, run:`);
    for (const bib of missingBibs) {
      console.log(`   npx tsx scripts/backfill-single-bib.ts ${bib}`);
    }
  } else {
    console.log(`\n✅ All bibs that failed scraping actually have lap data!`);
    console.log(`   This means they were successfully processed in a previous run.`);
  }
}

checkStatus().catch(console.error);
