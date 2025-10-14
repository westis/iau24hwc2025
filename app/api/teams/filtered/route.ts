import { NextRequest, NextResponse } from "next/server";
import { getRunners } from "@/lib/db/database";
import type { Runner, Gender } from "@/types/runner";
import type { Team } from "@/types/team";

// Enable ISR: revalidate every 60 seconds
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = (searchParams.get("gender") || "M") as Gender;
    const metric = searchParams.get("metric") || "last-3-years";

    // Fetch all runners from database
    const allRunners = await getRunners();

    // Filter runners for this gender
    const genderRunners = allRunners.filter((r) => r.gender === gender);

    // Group runners by nationality
    const teamGroups = new Map<string, Runner[]>();
    genderRunners.forEach((runner) => {
      const key = runner.nationality;
      if (!teamGroups.has(key)) {
        teamGroups.set(key, []);
      }
      teamGroups.get(key)!.push(runner);
    });

    // Calculate team totals
    const allTeams: Team[] = Array.from(teamGroups.entries()).map(
      ([nationality, allTeamRunners]) => {
        // Separate runners with PBs from those without, and DNS runners
        const runnersWithPB = allTeamRunners.filter((r) => {
          const pb =
            metric === "last-3-years"
              ? r.personalBestLast3Years
              : r.personalBestAllTime;
          return pb !== null && pb > 0 && !r.dns;
        });

        const runnersWithoutPB = allTeamRunners.filter((r) => {
          const pb =
            metric === "last-3-years"
              ? r.personalBestLast3Years
              : r.personalBestAllTime;
          return (pb === null || pb === 0) && !r.dns;
        });

        const dnsRunners = allTeamRunners.filter((r) => r.dns);

        // Sort runners with PB by PB (highest first)
        const sortedWithPB = runnersWithPB.sort((a, b) => {
          const aPB =
            metric === "last-3-years"
              ? a.personalBestLast3Years || 0
              : a.personalBestAllTime || 0;
          const bPB =
            metric === "last-3-years"
              ? b.personalBestLast3Years || 0
              : b.personalBestAllTime || 0;
          return bPB - aPB;
        });

        // Sort runners without PB by name
        const sortedWithoutPB = runnersWithoutPB.sort((a, b) => {
          const aName = `${a.lastname} ${a.firstname}`.toLowerCase();
          const bName = `${b.lastname} ${b.firstname}`.toLowerCase();
          return aName.localeCompare(bName);
        });

        // Sort DNS runners by name
        const sortedDNS = dnsRunners.sort((a, b) => {
          const aName = `${a.lastname} ${a.firstname}`.toLowerCase();
          const bName = `${b.lastname} ${b.firstname}`.toLowerCase();
          return aName.localeCompare(bName);
        });

        // Combine all runners for this team
        const sortedRunners = [
          ...sortedWithPB,
          ...sortedWithoutPB,
          ...sortedDNS,
        ];

        // Calculate team total from top 3 runners with PBs
        const top3Runners = sortedWithPB.slice(0, 3);
        const teamTotal = top3Runners.reduce((sum, runner) => {
          const pb =
            metric === "last-3-years"
              ? runner.personalBestLast3Years || 0
              : runner.personalBestAllTime || 0;
          return sum + pb;
        }, 0);

        return {
          nationality,
          runners: sortedRunners,
          totalDistance: teamTotal,
          runnerCount: allTeamRunners.length,
          hasPB: top3Runners.length >= 3,
        };
      }
    );

    // Separate teams with complete PBs from those without
    const teamsWithPB = allTeams.filter((t) => t.hasPB);
    const teamsWithoutPB = allTeams.filter((t) => !t.hasPB);

    // Sort teams with PB by total distance (highest first)
    const sortedWithPB = teamsWithPB.sort(
      (a, b) => b.totalDistance - a.totalDistance
    );

    // Sort teams without PB by name
    const sortedWithoutPB = teamsWithoutPB.sort((a, b) =>
      a.nationality.localeCompare(b.nationality)
    );

    // Combine: teams with PB first (ranked), then teams without PB
    const rankedTeams = sortedWithPB.map((team, index) => ({
      ...team,
      rank: index + 1,
    }));

    const unrankedTeams = sortedWithoutPB.map((team) => ({
      ...team,
      rank: undefined,
    }));

    const finalTeams = [...rankedTeams, ...unrankedTeams];

    return NextResponse.json(
      {
        teams: finalTeams,
        count: finalTeams.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Get filtered teams error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams", details: String(error) },
      { status: 500 }
    );
  }
}

