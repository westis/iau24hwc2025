// Backfill lap data from downloaded Breizh Chrono HTML
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

interface LapData {
  bib: number;
  lap: number;
  raceTimeSec: number;
  lapTimeSec: number;
  distanceKm: number;
  rank: number | null;
  genderRank: number | null;
}

function parseTime(timeStr: string): number {
  // Parse HH:MM:SS or MM:SS to seconds
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function parseDistance(distStr: string): number {
  // Parse "18,00384 km" to 18.00384
  return parseFloat(distStr.replace(",", ".").replace(" km", ""));
}

function extractBibFromTitle(title: string): number | null {
  // Extract from "RUEGER Pascal - Dossard 191 - M40"
  const match = title.match(/Dossard\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

async function backfillFromHTML() {
  const html = readFileSync("breizh-leaderboard.html", "utf-8");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: activeRace } = await supabase
    .from("race_info")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!activeRace) {
    console.log("❌ No active race found");
    return;
  }

  console.log(`✅ Active race ID: ${activeRace.id}\n`);

  // Find all modals with lap data
  const modalRegex = /<div class="modal-dialog[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
  const modals = html.match(modalRegex) || [];

  console.log(`Found ${modals.length} modals in HTML\n`);

  const allLaps: LapData[] = [];
  let runnersProcessed = 0;

  for (const modal of modals) {
    // Extract bib from modal title
    const titleMatch = modal.match(
      /<h5 class="modal-title"[^>]*>(.*?)<\/h5>/
    );
    if (!titleMatch) continue;

    const bib = extractBibFromTitle(titleMatch[1]);
    if (!bib) continue;

    // Check if modal has lap table
    if (!modal.includes("Passage") || !modal.includes("Temps global")) continue;

    // Extract table rows - pattern: N° LAP | RANK | CAT_RANK | RACE_TIME | LAP_TIME | ... | DISTANCE
    const rowRegex = /<td>N°\s*(\d+)<\/td>\s*<td>[^<]*(?:<sup>[^<]*<\/sup>)?[^<]*<\/td>\s*<td>[^<]*(?:<sup>[^<]*<\/sup>)?[^<]*<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*[\s\S]*?<td>\s*([\d,]+)/g;

    let match;
    const laps: LapData[] = [];

    while ((match = rowRegex.exec(modal)) !== null) {
      const lapNum = parseInt(match[1], 10);
      const raceTime = match[2].trim();
      const lapTime = match[3].trim();
      const distance = match[4].trim();

      const raceTimeSec = parseTime(raceTime);
      const lapTimeSec = parseTime(lapTime);
      const distanceKm = parseDistance(distance);

      laps.push({
        bib,
        lap: lapNum,
        raceTimeSec,
        lapTimeSec,
        distanceKm,
        rank: null,
        genderRank: null,
      });
    }

    if (laps.length > 0) {
      // Sort laps by lap number (they're in reverse order in HTML)
      laps.sort((a, b) => a.lap - b.lap);

      // Calculate cumulative values and paces
      for (let i = 0; i < laps.length; i++) {
        allLaps.push(laps[i]);
      }

      runnersProcessed++;
      if (runnersProcessed <= 5) {
        console.log(`Bib ${bib}: Found ${laps.length} laps`);
      }
    }
  }

  console.log(
    `\n✅ Extracted ${allLaps.length} laps from ${runnersProcessed} runners\n`
  );

  if (allLaps.length === 0) {
    console.log("❌ No lap data extracted!");
    return;
  }

  // Calculate lap paces and avg paces
  const lapsByRunner = new Map<number, LapData[]>();
  allLaps.forEach((lap) => {
    if (!lapsByRunner.has(lap.bib)) {
      lapsByRunner.set(lap.bib, []);
    }
    lapsByRunner.get(lap.bib)!.push(lap);
  });

  const enrichedLaps = [];
  for (const [bib, laps] of lapsByRunner) {
    laps.sort((a, b) => a.lap - b.lap);

    for (const lap of laps) {
      const lapPace = lap.lapTimeSec > 0 && lap.distanceKm > 0
        ? lap.lapTimeSec / (lap.distanceKm / 1.5) // Normalize to standard lap
        : 0;

      const avgPace = lap.raceTimeSec > 0 && lap.distanceKm > 0
        ? lap.raceTimeSec / lap.distanceKm
        : 0;

      enrichedLaps.push({
        race_id: activeRace.id,
        bib: lap.bib,
        lap: lap.lap,
        lap_time_sec: lap.lapTimeSec,
        race_time_sec: lap.raceTimeSec,
        distance_km: lap.distanceKm,
        rank: lap.rank,
        gender_rank: lap.genderRank,
        age_group_rank: null,
        lap_pace: lapPace,
        avg_pace: avgPace,
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.log(`Inserting ${enrichedLaps.length} laps into database...`);

  // Insert in batches of 500
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < enrichedLaps.length; i += batchSize) {
    const batch = enrichedLaps.slice(i, i + batchSize);
    const { error } = await supabase.from("race_laps").insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
      break;
    }

    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${enrichedLaps.length} laps...`);
  }

  console.log(`\n✅ Successfully backfilled ${inserted} laps!`);
}

backfillFromHTML().catch(console.error);
