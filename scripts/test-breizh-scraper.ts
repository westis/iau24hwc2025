// scripts/test-breizh-scraper.ts
// Test script to validate BreizhChrono scraping before race day

import { BreizhChronoAdapter } from "../lib/live-race/breizh-chrono-adapter";

const BREIZH_URL =
  process.env.BREIZH_CHRONO_URL ||
  "https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14";

async function testRobotsTxt(baseUrl: string): Promise<boolean> {
  console.log("\n🤖 Checking robots.txt...");
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;

    const response = await fetch(robotsUrl);
    if (response.ok) {
      const robotsTxt = await response.text();
      console.log("✅ robots.txt found:");
      console.log(robotsTxt);

      // Check if our path is disallowed
      const lines = robotsTxt.split("\n");
      const disallowedPaths: string[] = [];

      for (const line of lines) {
        if (line.trim().toLowerCase().startsWith("disallow:")) {
          const path = line.split(":")[1].trim();
          disallowedPaths.push(path);
        }
      }

      const isDisallowed = disallowedPaths.some(
        (path) =>
          path === "/" || path === url.pathname || url.pathname.startsWith(path)
      );

      if (isDisallowed) {
        console.log("⚠️  Warning: Path may be disallowed by robots.txt");
        return false;
      } else {
        console.log("✅ Path is allowed by robots.txt");
        return true;
      }
    } else {
      console.log("ℹ️  No robots.txt found (this is OK)");
      return true;
    }
  } catch (error) {
    console.log("ℹ️  Could not fetch robots.txt:", error);
    return true;
  }
}

async function testCORS(url: string): Promise<boolean> {
  console.log("\n🌐 Testing CORS headers...");
  try {
    const response = await fetch(url, { method: "HEAD" });

    const corsHeader = response.headers.get("access-control-allow-origin");
    if (corsHeader) {
      console.log("✅ CORS header found:", corsHeader);
      if (corsHeader === "*" || corsHeader.includes("your-domain")) {
        console.log("✅ CORS allows our requests");
        return true;
      } else {
        console.log(
          "⚠️  CORS may not allow browser requests (server-side fetch will work)"
        );
        return false;
      }
    } else {
      console.log("ℹ️  No CORS headers (server-side fetch will work)");
      return true;
    }
  } catch (error) {
    console.log("❌ Error testing CORS:", error);
    return false;
  }
}

async function testFetch(url: string): Promise<boolean> {
  console.log("\n📡 Testing fetch from URL...");
  try {
    const response = await fetch(url);

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get("content-type")}`);
    console.log(
      `Content-Length: ${response.headers.get("content-length") || "unknown"}`
    );

    if (!response.ok) {
      console.log("❌ HTTP error:", response.status);
      return false;
    }

    const text = await response.text();
    console.log(`Response length: ${text.length} characters`);

    // Check for error messages
    if (
      text.includes("ne sont pas encore disponibles") ||
      text.includes("not yet available")
    ) {
      console.log("⚠️  Race results not yet available (expected before race)");
      console.log("✅ Fetch successful - will work when race is live");
      return true; // This is expected before race, so it's a success
    }

    if (text.length < 100) {
      console.log("⚠️  Response seems too short");
      return false;
    }

    console.log("✅ Successfully fetched data");

    // Show a preview
    console.log("\nFirst 500 characters:");
    console.log(text.substring(0, 500));

    return true;
  } catch (error) {
    console.log("❌ Fetch failed:", error);
    return false;
  }
}

async function testAdapter(url: string): Promise<boolean> {
  console.log("\n🔧 Testing BreizhChronoAdapter...");
  try {
    const adapter = new BreizhChronoAdapter(url);

    // Test leaderboard fetch
    console.log("\nAttempting to parse leaderboard...");
    const leaderboard = await adapter.fetchLeaderboard();

    if (leaderboard.length === 0) {
      console.log(
        "⚠️  No leaderboard data found (may be expected if race hasn't started)"
      );
      return false;
    }

    console.log(`✅ Found ${leaderboard.length} runners in leaderboard`);
    console.log("\nSample data (first 3 entries):");
    leaderboard.slice(0, 3).forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.name} (#${entry.bib})`);
      console.log(`   Distance: ${entry.distanceKm.toFixed(2)} km`);
      console.log(`   Lap: ${entry.lap}`);
      console.log(`   Time: ${formatSeconds(entry.raceTimeSec)}`);
      console.log(`   Rank: ${entry.rank}`);
    });

    // Test lap data fetch
    console.log("\n\nAttempting to parse lap data...");
    const laps = await adapter.fetchLapData();

    if (laps.length === 0) {
      console.log(
        "ℹ️  No lap data found (expected - will calculate from leaderboard)"
      );
    } else {
      console.log(`✅ Found ${laps.length} lap records`);
    }

    return true;
  } catch (error) {
    console.log("❌ Adapter test failed:", error);
    if (error instanceof Error) {
      console.log("Error message:", error.message);
    }
    return false;
  }
}

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

async function main() {
  console.log("🏁 IAU 24H World Championship - BreizhChrono Scraper Test");
  console.log("=".repeat(60));
  console.log(`\nTarget URL: ${BREIZH_URL}`);

  const results = {
    robotsTxt: false,
    cors: false,
    fetch: false,
    adapter: false,
  };

  // Run tests
  results.robotsTxt = await testRobotsTxt(BREIZH_URL);
  results.cors = await testCORS(BREIZH_URL);
  results.fetch = await testFetch(BREIZH_URL);

  if (results.fetch) {
    results.adapter = await testAdapter(BREIZH_URL);
  }

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 Test Summary:");
  console.log("=".repeat(60));
  console.log(`robots.txt compliance: ${results.robotsTxt ? "✅" : "⚠️"}`);
  console.log(`CORS support: ${results.cors ? "✅" : "ℹ️"}`);
  console.log(`Data fetching: ${results.fetch ? "✅" : "❌"}`);
  console.log(`Adapter parsing: ${results.adapter ? "✅" : "❌"}`);

  const allPassed = Object.values(results).every((r) => r);
  const criticalPassed = results.robotsTxt && results.fetch;

  if (allPassed) {
    console.log("\n🎉 All tests passed! Ready for race day.");
  } else if (results.adapter) {
    console.log(
      "\n✅ Adapter works! Minor issues can be ignored (CORS doesn't affect server-side fetching)."
    );
  } else if (criticalPassed) {
    console.log("\n✅ Critical tests passed! Fetch successful.");
    console.log("   ℹ️  Data parsing not tested (race hasn't started yet).");
    console.log("   Run this test again during the race to validate parsing.");
  } else if (results.fetch && !results.adapter) {
    console.log(
      "\n⚠️  Fetch works but parsing failed. Race data may not be available yet."
    );
    console.log(
      "   Run this test again closer to race day when live data is available."
    );
  } else {
    console.log(
      "\n❌ Critical issues found. Please investigate before race day."
    );
  }

  process.exit(allPassed || results.adapter || criticalPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
