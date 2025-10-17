#!/usr/bin/env tsx
// Test if the API is fetching avatars correctly

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

async function testApiAvatars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🔍 Testing Supabase API avatar fetch...\n");

  // Test 1: Get runner #198 (Elov Olsson - we know has avatar)
  console.log("Test 1: Direct query for runner #198");
  const { data: runner198, error: error1 } = await supabase
    .from("runners")
    .select("bib, firstname, lastname, avatar_url")
    .eq("bib", 198)
    .single();

  if (error1) {
    console.log("❌ Error:", error1.message);
  } else {
    console.log("✅ Result:", runner198);
    console.log(`   avatar_url: ${runner198?.avatar_url ? "EXISTS" : "NULL"}`);
  }

  console.log("\nTest 2: Query multiple runners");
  const { data: runners, error: error2 } = await supabase
    .from("runners")
    .select("bib, avatar_url")
    .in("bib", [198, 199, 200]);

  if (error2) {
    console.log("❌ Error:", error2.message);
  } else {
    console.log("✅ Results:");
    runners?.forEach(r => {
      console.log(`   #${r.bib}: avatar_url = ${r.avatar_url ? "EXISTS" : "NULL"}`);
    });
  }

  console.log("\nTest 3: Check leaderboard for race");
  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (activeRace) {
    console.log(`\n✅ Active race ID: ${activeRace.id}`);

    const { data: leaderboard } = await supabase
      .from("race_leaderboard")
      .select("bib, name")
      .eq("race_id", activeRace.id)
      .limit(5);

    console.log(`\nTop 5 leaderboard bibs: ${leaderboard?.map(l => l.bib).join(", ")}`);

    if (leaderboard && leaderboard.length > 0) {
      const topBibs = leaderboard.map(l => l.bib);

      console.log("\nTest 4: Get avatars for top 5 leaderboard runners");
      const { data: topRunners, error: error4 } = await supabase
        .from("runners")
        .select("bib, firstname, lastname, avatar_url")
        .in("bib", topBibs);

      if (error4) {
        console.log("❌ Error:", error4.message);
      } else {
        console.log("✅ Results:");
        topRunners?.forEach(r => {
          console.log(`   #${r.bib} ${r.firstname} ${r.lastname}: ${r.avatar_url ? "HAS AVATAR" : "NO AVATAR"}`);
        });
      }
    }
  }

  process.exit(0);
}

testApiAvatars().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
