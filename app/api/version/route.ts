import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * API endpoint to get the current build version
 * Returns the Next.js build ID which changes with each deployment
 */
export async function GET() {
  try {
    // Read the build ID from .next/BUILD_ID
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");

    let buildId = "unknown";

    if (fs.existsSync(buildIdPath)) {
      buildId = fs.readFileSync(buildIdPath, "utf8").trim();
    } else {
      // Fallback for production environments where .next might not be accessible
      // Use deployment timestamp or environment variable
      buildId = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || "production";
    }

    return NextResponse.json(
      {
        buildId,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error reading build ID:", error);
    return NextResponse.json(
      {
        buildId: "error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
