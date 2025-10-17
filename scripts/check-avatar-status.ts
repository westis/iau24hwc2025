#!/usr/bin/env tsx
// Check avatar status in database

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function checkAvatarStatus() {
  const db = getDatabase();

  console.log("🔍 Checking avatar status in database...\n");

  // Check all runners with photos
  const result = await db.query(
    `SELECT
      bib,
      firstname,
      lastname,
      photo_url IS NOT NULL as has_photo,
      avatar_url IS NOT NULL as has_avatar,
      CASE
        WHEN photo_url IS NOT NULL AND avatar_url IS NOT NULL THEN '✅ Has both'
        WHEN photo_url IS NOT NULL AND avatar_url IS NULL THEN '❌ Missing avatar'
        WHEN photo_url IS NULL THEN '⚪ No photo'
      END as status,
      LEFT(photo_url, 50) as photo_preview,
      LEFT(avatar_url, 50) as avatar_preview
     FROM runners
     WHERE photo_url IS NOT NULL OR avatar_url IS NOT NULL
     ORDER BY bib
     LIMIT 20`
  );

  console.log(`Found ${result.rows.length} runners with photo/avatar data:\n`);

  result.rows.forEach(row => {
    console.log(`#${row.bib} ${row.firstname} ${row.lastname}: ${row.status}`);
    if (row.photo_preview) {
      console.log(`  Photo: ${row.photo_preview}...`);
    }
    if (row.avatar_preview) {
      console.log(`  Avatar: ${row.avatar_preview}...`);
    }
    console.log();
  });

  // Count totals
  const counts = await db.query(
    `SELECT
      COUNT(*) FILTER (WHERE photo_url IS NOT NULL) as with_photo,
      COUNT(*) FILTER (WHERE avatar_url IS NOT NULL) as with_avatar,
      COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND avatar_url IS NULL) as missing_avatar
     FROM runners`
  );

  console.log("📊 Summary:");
  console.log(`  Runners with photo_url: ${counts.rows[0].with_photo}`);
  console.log(`  Runners with avatar_url: ${counts.rows[0].with_avatar}`);
  console.log(`  Missing avatars: ${counts.rows[0].missing_avatar}`);

  process.exit(0);
}

checkAvatarStatus().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
