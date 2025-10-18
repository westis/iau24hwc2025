// Detect runners with missing lap numbers and backfill them
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

config({ path: resolve(process.cwd(), ".env.local") });

interface RunnerLapGap {
  bib: number;
  maxLap: number;
  missingLaps: number[];
}

async function detectGaps() {
  console.log("🔍 Detecting lap gaps in race data...\n");

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

  // Get all laps from the database
  const { data: allLaps } = await supabase
    .from("race_laps")
    .select("bib, lap")
    .eq("race_id", activeRace.id)
    .order("bib", { ascending: true })
    .order("lap", { ascending: true });

  if (!allLaps || allLaps.length === 0) {
    console.log("❌ No lap data found");
    return;
  }

  // Group laps by bib
  const lapsByBib = new Map<number, number[]>();
  allLaps.forEach(lap => {
    if (!lapsByBib.has(lap.bib)) {
      lapsByBib.set(lap.bib, []);
    }
    lapsByBib.get(lap.bib)!.push(lap.lap);
  });

  // Find gaps
  const runnersWithGaps: RunnerLapGap[] = [];

  for (const [bib, laps] of lapsByBib.entries()) {
    const sortedLaps = laps.sort((a, b) => a - b);
    const maxLap = Math.max(...sortedLaps);
    const missingLaps: number[] = [];

    // Check for missing lap numbers
    for (let expectedLap = 1; expectedLap <= maxLap; expectedLap++) {
      if (!sortedLaps.includes(expectedLap)) {
        missingLaps.push(expectedLap);
      }
    }

    if (missingLaps.length > 0) {
      runnersWithGaps.push({
        bib,
        maxLap,
        missingLaps,
      });
    }
  }

  if (runnersWithGaps.length === 0) {
    console.log("✅ No gaps found! All lap sequences are complete.");
    return;
  }

  console.log(`⚠️  Found ${runnersWithGaps.length} runners with missing laps:\n`);

  // Sort by number of missing laps (descending)
  runnersWithGaps.sort((a, b) => b.missingLaps.length - a.missingLaps.length);

  // Display first 20 runners with gaps
  const displayLimit = 20;
  for (let i = 0; i < Math.min(displayLimit, runnersWithGaps.length); i++) {
    const runner = runnersWithGaps[i];
    console.log(`   Bib ${runner.bib}: Missing ${runner.missingLaps.length} laps (${runner.missingLaps.join(", ")})`);
  }

  if (runnersWithGaps.length > displayLimit) {
    console.log(`   ... and ${runnersWithGaps.length - displayLimit} more runners`);
  }

  console.log(`\n📊 Total runners with gaps: ${runnersWithGaps.length}`);
  console.log(`📊 Total missing laps: ${runnersWithGaps.reduce((sum, r) => sum + r.missingLaps.length, 0)}`);

  // Ask user if they want to backfill
  console.log("\n💡 To backfill these gaps, run:");
  console.log("   npx tsx scripts/backfill-gaps.ts");
}

detectGaps().catch(console.error);
