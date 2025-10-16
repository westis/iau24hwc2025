import { NextRequest, NextResponse } from "next/server";
import { getRunners } from "@/lib/db/database";
import type { Runner } from "@/types/runner";

// Enable ISR: revalidate every 60 seconds
export const revalidate = 60;

interface RankedRunner extends Runner {
  rank?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender") || "M";
    const metric = searchParams.get("metric") || "last-3-years";
    const country = searchParams.get("country") || "all";
    const search = searchParams.get("search") || "";

    // Fetch all runners from database
    const allRunners = await getRunners();

    // STEP 1: Filter by gender
    let filtered = allRunners.filter((r) => r.gender === gender);

    // Get PB value based on metric
    const getPB = (runner: Runner) => {
      return metric === "last-3-years"
        ? runner.personalBestLast3Years || 0
        : runner.personalBestAllTime || 0;
    };

    // Separate matched (with DUV ID) and unmatched runners
    const matched = filtered.filter((r) => r.duvId !== null);
    const unmatched = filtered.filter((r) => r.duvId === null);

    // Sort matched runners by PB (highest first)
    const sortedMatched = matched.sort((a, b) => {
      const aPB = getPB(a);
      const bPB = getPB(b);
      return bPB - aPB; // Descending order
    });

    // Sort unmatched runners by name
    const sortedUnmatched = unmatched.sort((a, b) => {
      const aName = `${a.lastname} ${a.firstname}`.toLowerCase();
      const bName = `${b.lastname} ${b.firstname}`.toLowerCase();
      return aName.localeCompare(bName);
    });

    // Assign rankings (before country/search filtering for total rankings)
    let currentRank = 1;
    const rankedMatched: RankedRunner[] = sortedMatched.map((runner) => {
      if (runner.dns) {
        return { ...runner, rank: undefined };
      } else {
        return { ...runner, rank: currentRank++ };
      }
    });

    // Combine ranked matched + unmatched
    let results: RankedRunner[] = [...rankedMatched, ...sortedUnmatched];

    // STEP 2: Apply country filter
    if (country !== "all") {
      results = results.filter((r) => r.nationality === country);
    }

    // STEP 3: Apply search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      results = results.filter((r) => {
        const name = `${r.firstname} ${r.lastname}`.toLowerCase();
        return name.includes(query);
      });
    }

    // Get unique countries from ALL runners (for filter dropdown)
    const uniqueCountries = Array.from(
      new Set(allRunners.map((r) => r.nationality))
    ).sort();

    return NextResponse.json(
      {
        runners: results,
        countries: uniqueCountries,
        count: results.length,
        totalForGender: filtered.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Get filtered runners error:", error);
    return NextResponse.json(
      { error: "Failed to fetch runners", details: String(error) },
      { status: 500 }
    );
  }
}






