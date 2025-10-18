// Test DISTINCT ON query to get latest lap per runner
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function test() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Test: Get latest lap per runner using raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT DISTINCT ON (bib) bib, lap, distance_km, race_time_sec
      FROM race_laps
      WHERE race_id = 1
      ORDER BY bib, lap DESC
      LIMIT 10
    `
  });

  console.log("Result:", data, error);
}

test().catch(console.error);
