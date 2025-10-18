// Check actual column names in runners table
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkColumnNames() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get ONE runner with ALL columns (select *)
  const { data: runners, error } = await supabase
    .from("runners")
    .select("*")
    .eq("bib", 191)
    .single();

  if (error) {
    console.log(`❌ Error: ${error.message}`);
    return;
  }

  console.log(`📋 ALL columns for Bib 191:\n`);
  console.log(JSON.stringify(runners, null, 2));
}

checkColumnNames().catch(console.error);
