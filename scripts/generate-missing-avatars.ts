#!/usr/bin/env tsx
// Script to generate avatar_url for all runners who have photo_url but no avatar_url
// This creates optimized 80px, 160px @2x, and 320px @3x versions

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { getDatabase } from "../lib/db/database";

async function generateMissingAvatars() {
  const db = getDatabase();

  console.log("🔍 Finding runners with photos but no avatars...\n");

  // Find all runners with photo_url but no avatar_url
  const result = await db.query(
    `SELECT id, bib, firstname, lastname, photo_url, photo_focal_x, photo_focal_y, photo_zoom
     FROM runners
     WHERE photo_url IS NOT NULL
       AND (avatar_url IS NULL OR avatar_url = '')
     ORDER BY bib`
  );

  const runners = result.rows;

  if (runners.length === 0) {
    console.log("✅ All runners with photos already have avatars!");
    process.exit(0);
  }

  console.log(`📸 Found ${runners.length} runners needing avatars\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ bib: number; error: string }> = [];

  for (const runner of runners) {
    const fullName = `${runner.firstname} ${runner.lastname}`;
    process.stdout.write(`Processing #${runner.bib} ${fullName}... `);

    try {
      const cropResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/upload/crop-avatar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: runner.photo_url,
            focalX: runner.photo_focal_x ?? 50,
            focalY: runner.photo_focal_y ?? 50,
            zoom: runner.photo_zoom ?? 1.5,
            bucket: "runner-photos",
          }),
        }
      );

      if (!cropResponse.ok) {
        const errorText = await cropResponse.text();
        throw new Error(`HTTP ${cropResponse.status}: ${errorText}`);
      }

      const { avatarUrl } = await cropResponse.json();

      // Update database
      await db.query(
        "UPDATE runners SET avatar_url = $1 WHERE id = $2",
        [avatarUrl, runner.id]
      );

      console.log("✅");
      successCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${errorMsg}`);
      errorCount++;
      errors.push({ bib: runner.bib, error: errorMsg });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log("\n❌ Failed runners:");
    errors.forEach(({ bib, error }) => {
      console.log(`  #${bib}: ${error}`);
    });
  }

  console.log("\n✨ Done!");
  process.exit(errors.length > 0 ? 1 : 0);
}

// Run the script
generateMissingAvatars().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
