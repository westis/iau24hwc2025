// Quick check of Bib 212 laps
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: laps, error } = await supabase
    .from("race_laps")
    .select("lap, race_time_sec, lap_time_sec")
    .eq("race_id", 1)
    .eq("bib", 212)
    .order("lap", { ascending: true });

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  console.log(`\nBib 212 has ${laps.length} laps in database:\n`);

  const lapNumbers = laps.map(l => l.lap).sort((a, b) => a - b);
  const maxLap = Math.max(...lapNumbers);

  // Show first 10 and last 10
  console.log("First 10 laps:");
  laps.slice(0, 10).forEach(lap => {
    console.log(`  Lap ${lap.lap}: race_time=${lap.race_time_sec}s, lap_time=${lap.lap_time_sec}s`);
  });

  console.log("\nLast 10 laps:");
  laps.slice(-10).forEach(lap => {
    console.log(`  Lap ${lap.lap}: race_time=${lap.race_time_sec}s, lap_time=${lap.lap_time_sec}s`);
  });

  // Check for gaps
  const missing = [];
  for (let i = 1; i <= maxLap; i++) {
    if (!lapNumbers.includes(i)) missing.push(i);
  }

  console.log(`\n\nMax lap: ${maxLap}`);
  console.log(`Total laps: ${lapNumbers.length}`);
  console.log(`Expected laps (1 to ${maxLap}): ${maxLap}`);

  if (missing.length > 0) {
    console.log(`\n❌ MISSING LAPS: ${missing.join(", ")}`);
  } else {
    console.log("\n✅ No gaps found - all lap numbers from 1 to " + maxLap + " are present!");
  }
}

check().catch(console.error);
