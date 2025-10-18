// Check runners table structure and data
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkRunnersTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check top 5 runners by bib
  const { data: runners, error } = await supabase
    .from("runners")
    .select("*")
    .in("bib", [191, 193, 68, 94, 212])
    .order("bib", { ascending: true });

  if (error) {
    console.log(`❌ Error fetching runners: ${error.message}`);
    return;
  }

  console.log(`📊 Runners table data for top 5 bibs:\n`);

  if (runners && runners.length > 0) {
    runners.forEach((runner) => {
      console.log(`Bib ${runner.bib}:`);
      console.log(`  Name: ${runner.first_name} ${runner.last_name}`);
      console.log(`  Gender: ${runner.gender || 'NULL'}`);
      console.log(`  Nationality: ${runner.nationality || 'NULL'}`);
      console.log(`  Team: ${runner.team || 'NULL'}`);
      console.log();
    });
  } else {
    console.log("❌ No runners found with these bibs!");
  }

  // Check total count
  const { count } = await supabase
    .from("runners")
    .select("*", { count: "exact", head: true })
    .not("bib", "is", null);

  console.log(`📈 Total runners with bib numbers: ${count}`);

  // Check sample of runners with nationality
  const { data: withNationality } = await supabase
    .from("runners")
    .select("bib, first_name, last_name, nationality")
    .not("nationality", "is", null)
    .limit(5);

  console.log(`\n✅ Sample runners WITH nationality:`);
  if (withNationality && withNationality.length > 0) {
    withNationality.forEach((r) => {
      console.log(`  Bib ${r.bib}: ${r.first_name} ${r.last_name} - ${r.nationality}`);
    });
  } else {
    console.log("  ❌ NO runners have nationality set!");
  }
}

checkRunnersTable().catch(console.error);
