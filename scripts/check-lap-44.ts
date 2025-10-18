// Check lap 44 for bib 191
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkLap44() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  const { data: lap44 } = await supabase
    .from("race_laps")
    .select("*")
    .eq("race_id", activeRace!.id)
    .eq("bib", 191)
    .eq("lap", 44)
    .single();

  if (lap44) {
    console.log(`Lap 44 for Bib 191:`);
    console.log(`  race_time_sec: ${lap44.race_time_sec} (${Math.floor(lap44.race_time_sec/3600)}h ${Math.floor((lap44.race_time_sec%3600)/60)}m ${lap44.race_time_sec%60}s)`);
    console.log(`  lap_time_sec: ${lap44.lap_time_sec} (${Math.floor(lap44.lap_time_sec/60)}m ${lap44.lap_time_sec%60}s)`);
    console.log(`  distance_km: ${lap44.distance_km}`);
    console.log(`  timestamp: ${lap44.timestamp}`);
  } else {
    console.log("Lap 44 not found!");
  }
}

checkLap44().catch(console.error);
