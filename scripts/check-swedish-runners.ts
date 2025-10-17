#!/usr/bin/env tsx
// Check which Swedish runners have avatars

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function checkSwedishRunners() {
  const db = getDatabase();

  console.log("🇸🇪 Checking Swedish runners...\n");

  const result = await db.query(
    `SELECT
      bib,
      firstname,
      lastname,
      photo_url IS NOT NULL as has_photo,
      avatar_url IS NOT NULL as has_avatar,
      CASE
        WHEN avatar_url IS NOT NULL THEN '✅ Has avatar'
        WHEN photo_url IS NOT NULL THEN '⚠️ Has photo, needs avatar generation'
        ELSE '❌ No photo/avatar'
      END as status
     FROM runners
     WHERE nationality = 'SWE'
     ORDER BY bib`
  );

  console.log(`Found ${result.rows.length} Swedish runners:\n`);

  const withAvatar: number[] = [];
  const needsGeneration: number[] = [];
  const noPhoto: number[] = [];

  result.rows.forEach(row => {
    console.log(`#${row.bib.toString().padStart(3)} ${row.firstname} ${row.lastname}: ${row.status}`);

    if (row.has_avatar) {
      withAvatar.push(row.bib);
    } else if (row.has_photo) {
      needsGeneration.push(row.bib);
    } else {
      noPhoto.push(row.bib);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log(`✅ With avatars (${withAvatar.length}): ${withAvatar.join(", ") || "none"}`);
  console.log(`⚠️ Need generation (${needsGeneration.length}): ${needsGeneration.join(", ") || "none"}`);
  console.log(`❌ No photos (${noPhoto.length}): ${noPhoto.slice(0, 20).join(", ")}${noPhoto.length > 20 ? "..." : ""}`);

  process.exit(0);
}

checkSwedishRunners().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
