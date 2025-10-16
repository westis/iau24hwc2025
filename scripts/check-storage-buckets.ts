/**
 * Script to check if all required Supabase storage buckets exist
 * Run with: npx tsx scripts/check-storage-buckets.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const REQUIRED_BUCKETS = [
  { name: "runner-photos", public: true },
  { name: "team-photos", public: true },
  { name: "race-photos", public: true },
  { name: "chat-avatars", public: true },
  { name: "news-images", public: true },
];

async function checkBuckets() {
  console.log("🔍 Checking Supabase storage buckets...\n");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing environment variables!");
    console.error(
      "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("❌ Error fetching buckets:", error.message);
      process.exit(1);
    }

    const existingBucketNames = buckets?.map((b) => b.name) || [];

    console.log("📦 Existing buckets:");
    buckets?.forEach((bucket) => {
      console.log(
        `  ✅ ${bucket.name} ${bucket.public ? "(public)" : "(private)"}`
      );
    });

    console.log("\n🔍 Checking required buckets:");
    let allExist = true;

    for (const required of REQUIRED_BUCKETS) {
      const exists = existingBucketNames.includes(required.name);
      if (exists) {
        const bucket = buckets?.find((b) => b.name === required.name);
        const isPublic = bucket?.public;
        const publicMatch = isPublic === required.public;

        if (publicMatch) {
          console.log(`  ✅ ${required.name} - OK`);
        } else {
          console.log(
            `  ⚠️  ${required.name} - EXISTS but should be ${
              required.public ? "public" : "private"
            }`
          );
        }
      } else {
        console.log(`  ❌ ${required.name} - MISSING`);
        allExist = false;
      }
    }

    if (allExist) {
      console.log("\n✅ All required buckets exist!");
    } else {
      console.log("\n❌ Some buckets are missing!");
      console.log("\n📝 To create missing buckets:");
      console.log("1. Go to your Supabase Dashboard");
      console.log("2. Navigate to Storage");
      console.log("3. Click 'New bucket' for each missing bucket");
      console.log("4. Or run the migration SQL in SQL Editor");
      console.log("\nSee FIX_NEWS_IMAGE_UPLOAD.md for detailed instructions");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

checkBuckets();
