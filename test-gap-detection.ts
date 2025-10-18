// Test gap detection logic
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function testGapDetection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("Fetching all laps for race_id 1...");

  const { data: allLaps, error } = await supabase
    .from("race_laps")
    .select("bib, lap")
    .eq("race_id", 1)
    .order("bib", { ascending: true })
    .order("lap", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Fetched ${allLaps?.length || 0} total laps`);

  // Build map of laps by bib
  const lapsByBib = new Map<number, number[]>();
  allLaps?.forEach((lap: any) => {
    if (!lapsByBib.has(lap.bib)) {
      lapsByBib.set(lap.bib, []);
    }
    lapsByBib.get(lap.bib)!.push(lap.lap);
  });

  console.log(`Found ${lapsByBib.size} unique bibs`);

  // Check for gaps in Bib 212
  const bib212Laps = lapsByBib.get(212);
  if (bib212Laps) {
    const sortedLaps = bib212Laps.sort((a, b) => a - b);
    const maxLap = Math.max(...sortedLaps);
    const missingLaps: number[] = [];

    for (let expectedLap = 1; expectedLap <= maxLap; expectedLap++) {
      if (!sortedLaps.includes(expectedLap)) {
        missingLaps.push(expectedLap);
      }
    }

    console.log(`\nBib 212:`);
    console.log(`  Total laps in data: ${sortedLaps.length}`);
    console.log(`  Max lap: ${maxLap}`);
    console.log(`  Missing laps: ${missingLaps.length > 0 ? missingLaps.join(", ") : "None"}`);
  } else {
    console.log("\nBib 212: NOT FOUND");
  }

  // Count total gaps across all runners
  let runnersWithGaps = 0;
  let totalMissingLaps = 0;

  for (const [bib, laps] of lapsByBib.entries()) {
    const sortedLaps = laps.sort((a, b) => a - b);
    const maxLap = Math.max(...sortedLaps);
    const missingLaps: number[] = [];

    for (let expectedLap = 1; expectedLap <= maxLap; expectedLap++) {
      if (!sortedLaps.includes(expectedLap)) {
        missingLaps.push(expectedLap);
      }
    }

    if (missingLaps.length > 0) {
      runnersWithGaps++;
      totalMissingLaps += missingLaps.length;
      if (runnersWithGaps <= 10) {
        console.log(`\nBib ${bib}: Missing ${missingLaps.length} laps: ${missingLaps.join(", ")}`);
      }
    }
  }

  console.log(`\n\nSummary:`);
  console.log(`  Runners with gaps: ${runnersWithGaps}`);
  console.log(`  Total missing laps: ${totalMissingLaps}`);
}

testGapDetection().catch(console.error);
