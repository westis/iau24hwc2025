// scripts/import-bib-numbers.ts
// Import bib numbers from CSV files and match with database runners

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: path.join(__dirname, "../.env.local") });

interface CsvRunner {
  bib: number;
  code: string; // 3-letter country code
  country: string;
  name: string; // lastname
  category: string;
}

interface DbRunner {
  id: number;
  entryId: string;
  firstname: string;
  lastname: string;
  nationality: string;
  gender: string;
  bib: number | null;
}

function parseCsv(csvPath: string): CsvRunner[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());

  // Skip header
  const runners: CsvRunner[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle commas in names)
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const bib = parseInt(parts[0]);
    const code = parts[1];
    const country = parts[2];
    const name = parts[3];
    const category = parts[4] || "";

    if (isNaN(bib)) continue;

    runners.push({ bib, code, country, name, category });
  }

  return runners;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]/g, "");
}

function findMatch(
  csvRunner: CsvRunner,
  dbRunners: DbRunner[]
): DbRunner | null {
  // Try to match by lastname and nationality code
  const normalizedCsvName = normalizeString(csvRunner.name);
  const csvNationality = csvRunner.code;

  for (const dbRunner of dbRunners) {
    const normalizedDbName = normalizeString(dbRunner.lastname);

    // Check if lastname matches and nationality matches
    if (
      normalizedDbName === normalizedCsvName &&
      dbRunner.nationality === csvNationality
    ) {
      return dbRunner;
    }
  }

  // If no exact match, try partial lastname match with same nationality
  for (const dbRunner of dbRunners) {
    const normalizedDbName = normalizeString(dbRunner.lastname);

    if (
      normalizedDbName.includes(normalizedCsvName) ||
      normalizedCsvName.includes(normalizedDbName)
    ) {
      if (dbRunner.nationality === csvNationality) {
        return dbRunner;
      }
    }
  }

  return null;
}

async function main() {
  console.log("🔢 Importing bib numbers from CSV files...\n");

  // Get Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials!");
    console.error(
      "   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Load CSV files
  const womenCsvPath = path.join(
    __dirname,
    "../../24H_Worlds_Women_Entry_List__Parsed_.csv"
  );
  const menCsvPath = path.join(
    __dirname,
    "../../24H_Worlds_Men_Entry_List__Parsed_.csv"
  );

  let womenRunners: CsvRunner[] = [];
  let menRunners: CsvRunner[] = [];

  if (fs.existsSync(womenCsvPath)) {
    womenRunners = parseCsv(womenCsvPath);
    console.log(`📋 Loaded ${womenRunners.length} women from CSV`);
  } else {
    console.log("⚠️  Women's CSV not found:", womenCsvPath);
  }

  if (fs.existsSync(menCsvPath)) {
    menRunners = parseCsv(menCsvPath);
    console.log(`📋 Loaded ${menRunners.length} men from CSV`);
  } else {
    console.log("⚠️  Men's CSV not found:", menCsvPath);
  }

  const allCsvRunners = [...womenRunners, ...menRunners];

  if (allCsvRunners.length === 0) {
    console.error("\n❌ No CSV files found!");
    console.error("   Place CSV files in the project root:");
    console.error("   - 24H_Worlds_Women_Entry_List__Parsed_.csv");
    console.error("   - 24H_Worlds_Men_Entry_List__Parsed_.csv");
    process.exit(1);
  }

  console.log(`\n📊 Total runners in CSV: ${allCsvRunners.length}\n`);

  // Load all runners from database
  console.log("🔍 Loading runners from database...");
  const { data: dbRunners, error } = await supabase
    .from("runners")
    .select("id, entry_id, firstname, lastname, nationality, gender, bib");

  if (error || !dbRunners) {
    console.error("❌ Error loading runners from database:", error);
    process.exit(1);
  }

  console.log(`   Found ${dbRunners.length} runners in database\n`);

  // Match and update
  const updates: Array<{ id: number; bib: number; name: string }> = [];
  const unmatched: CsvRunner[] = [];

  console.log("🔗 Matching runners...\n");

  for (const csvRunner of allCsvRunners) {
    const match = findMatch(csvRunner, dbRunners);

    if (match) {
      updates.push({
        id: match.id,
        bib: csvRunner.bib,
        name: `${match.firstname} ${match.lastname}`,
      });
      console.log(
        `✅ #${csvRunner.bib.toString().padStart(3)} → ${match.firstname} ${
          match.lastname
        } (${match.nationality})`
      );
    } else {
      unmatched.push(csvRunner);
      console.log(
        `❌ #${csvRunner.bib.toString().padStart(3)} → ${csvRunner.name} (${
          csvRunner.code
        }) - NO MATCH`
      );
    }
  }

  console.log(`\n📊 Match Summary:`);
  console.log(`   Matched: ${updates.length}/${allCsvRunners.length}`);
  console.log(`   Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Unmatched runners:`);
    unmatched.forEach((r) => {
      console.log(`   #${r.bib} - ${r.name} (${r.code})`);
    });
  }

  // Ask for confirmation
  console.log(`\n\n🔄 Ready to update ${updates.length} runners in database.`);
  console.log(`   This will set their bib numbers.`);
  console.log(`\n   Continue? (You can review the matches above)`);
  console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to proceed...`);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log(`\n💾 Updating database...`);

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from("runners")
      .update({ bib: update.bib })
      .eq("id", update.id);

    if (error) {
      console.error(`   ❌ Failed to update ${update.name}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Successfully updated: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (successCount > 0) {
    console.log(`\n🎉 Bib numbers have been imported!`);
    console.log(`   You can now use the live timing system.`);
    console.log(`   Check the admin panel: /admin/bib-numbers`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
