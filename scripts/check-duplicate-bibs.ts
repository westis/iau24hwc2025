// scripts/check-duplicate-bibs.ts
// Check for duplicate bib numbers in the database

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import * as path from "path";

// Load environment variables
config({ path: path.join(__dirname, "../.env.local") });

async function main() {
  console.log("🔍 Checking for duplicate bib numbers...\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials!");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all runners with bib numbers
  const { data: runners, error } = await supabase
    .from("runners")
    .select("id, entry_id, firstname, lastname, nationality, gender, bib")
    .not("bib", "is", null)
    .order("bib");

  if (error || !runners) {
    console.error("❌ Error loading runners:", error);
    process.exit(1);
  }

  console.log(`📊 Total runners with bib numbers: ${runners.length}\n`);

  // Find duplicates
  const bibCounts = new Map<number, any[]>();

  for (const runner of runners) {
    if (!bibCounts.has(runner.bib)) {
      bibCounts.set(runner.bib, []);
    }
    bibCounts.get(runner.bib)!.push(runner);
  }

  // Filter to only duplicates
  const duplicates = Array.from(bibCounts.entries())
    .filter(([bib, runners]) => runners.length > 1)
    .sort(([a], [b]) => a - b);

  if (duplicates.length === 0) {
    console.log("✅ No duplicate bib numbers found!");
    console.log("   All runners have unique bib numbers.\n");

    // Show stats
    const bibNumbers = runners.map((r) => r.bib);
    const minBib = Math.min(...bibNumbers);
    const maxBib = Math.max(...bibNumbers);
    const menCount = runners.filter((r) => r.gender === "M").length;
    const womenCount = runners.filter((r) => r.gender === "W").length;

    console.log("📊 Statistics:");
    console.log(`   Bib range: ${minBib} - ${maxBib}`);
    console.log(`   Men: ${menCount} (expected 1-224)`);
    console.log(`   Women: ${womenCount} (expected 240-410)`);
    console.log(`   Total: ${runners.length} runners`);

    process.exit(0);
  }

  console.log(`❌ Found ${duplicates.length} duplicate bib numbers:\n`);

  for (const [bib, runners] of duplicates) {
    console.log(`🔴 Bib #${bib} assigned to ${runners.length} runners:`);
    for (const runner of runners) {
      console.log(
        `   - ${runner.firstname} ${runner.lastname} (${runner.nationality}) - ID: ${runner.id}`
      );
    }
    console.log("");
  }

  console.log(
    "\n⚠️  Please fix these duplicates in Supabase or via /admin/bib-numbers"
  );
  process.exit(1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
