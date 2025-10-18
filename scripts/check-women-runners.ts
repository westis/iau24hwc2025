// Check gender values for women in database
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkWomenRunners() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check all unique gender values
  const { data: genders } = await supabase
    .from("runners")
    .select("gender")
    .not("bib", "is", null);

  const uniqueGenders = [...new Set(genders?.map((r) => r.gender))];
  console.log(`📊 Unique gender values in runners table: ${JSON.stringify(uniqueGenders)}\n`);

  // Get sample of female runners
  const { data: women } = await supabase
    .from("runners")
    .select("bib, firstname, lastname, gender, nationality")
    .in("gender", ["W", "F", "w", "f"])
    .limit(5);

  if (women && women.length > 0) {
    console.log(`✅ Found ${women.length} women runners (first 5):`);
    women.forEach((w) => {
      console.log(`  Bib ${w.bib}: ${w.firstname} ${w.lastname} - Gender: "${w.gender}", Nationality: ${w.nationality}`);
    });
  } else {
    console.log("❌ No women found with gender W, F, w, or f");
  }

  // Check leaderboard for women
  console.log(`\n📊 Checking race_leaderboard for women...\n`);

  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  const { data: leaderboardWomen } = await supabase
    .from("race_leaderboard")
    .select("bib, name, gender, country")
    .eq("race_id", activeRace!.id)
    .in("gender", ["w", "f"])
    .limit(5);

  if (leaderboardWomen && leaderboardWomen.length > 0) {
    console.log(`✅ Found ${leaderboardWomen.length} women in leaderboard:`);
    leaderboardWomen.forEach((w) => {
      console.log(`  Bib ${w.bib}: ${w.name} - Gender: "${w.gender}", Country: ${w.country}`);
    });
  } else {
    console.log("❌ No women in race_leaderboard");
  }
}

checkWomenRunners().catch(console.error);
