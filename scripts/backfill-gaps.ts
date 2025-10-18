// Detect and backfill runners with missing lap numbers
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import puppeteer from "puppeteer";

config({ path: resolve(process.cwd(), ".env.local") });

interface RunnerLapGap {
  bib: number;
  maxLap: number;
  missingLaps: number[];
}

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
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function parseDistance(distStr: string): number {
  return parseFloat(distStr.replace(",", ".").replace(" km", "").trim());
}

async function detectGaps(supabase: any, raceId: string): Promise<RunnerLapGap[]> {
  const { data: allLaps } = await supabase
    .from("race_laps")
    .select("bib, lap")
    .eq("race_id", raceId)
    .order("bib", { ascending: true })
    .order("lap", { ascending: true });

  if (!allLaps || allLaps.length === 0) {
    return [];
  }

  const lapsByBib = new Map<number, number[]>();
  allLaps.forEach((lap: any) => {
    if (!lapsByBib.has(lap.bib)) {
      lapsByBib.set(lap.bib, []);
    }
    lapsByBib.get(lap.bib)!.push(lap.lap);
  });

  const runnersWithGaps: RunnerLapGap[] = [];

  for (const [bib, laps] of lapsByBib.entries()) {
    const sortedLaps = laps.sort((a, b) => a - b);
    const maxLap = Math.max(...sortedLaps);
    const missingLaps: number[] = [];

    for (let expectedLap = 1; expectedLap <= maxLap; expectedLap++) {
      if (!sortedLaps.includes(expectedLap)) {
        missingLaps.push(expectedLap);
      }
    }

    if (missingLaps.length > 0) {
      runnersWithGaps.push({ bib, maxLap, missingLaps });
    }
  }

  return runnersWithGaps;
}

async function backfillBib(
  browser: any,
  page: any,
  bibNumber: number,
  supabase: any,
  raceId: string,
  totalPages: number
): Promise<boolean> {
  try {
    console.log(`   🔍 Searching for Bib ${bibNumber}...`);

    let runner: any = null;

    // Search through all pages
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      await page.evaluate((index: number) => {
        (window as any).quickSearch(index);
      }, pageIndex);

      await new Promise(resolve => setTimeout(resolve, 1500));

      runner = await page.evaluate((bib: number) => {
        const runnerLinks = Array.from(document.querySelectorAll('a[href^="javascript:showDetails"]'));
        for (const link of runnerLinks) {
          const text = (link as HTMLElement).textContent || "";
          const bibMatch = text.match(/N°(\d+)/);
          if (bibMatch && parseInt(bibMatch[1], 10) === bib) {
            const detailsMatch = (link as HTMLElement).getAttribute("href")?.match(/showDetails\('([^']+)'\)/);
            return {
              bib: bib,
              modalId: detailsMatch ? detailsMatch[1] : null,
              name: text.split("-").slice(1).join("-").trim(),
            };
          }
        }
        return null;
      }, bibNumber);

      if (runner) break;
    }

    if (!runner) {
      console.log(`   ❌ Bib ${bibNumber} not found`);
      return false;
    }

    // Open modal
    await page.evaluate((modalId: string) => {
      const link = document.querySelector(`a[href="javascript:showDetails('${modalId}')"]`) as HTMLElement;
      if (link) link.click();
    }, runner.modalId);

    await page.waitForSelector(`#${runner.modalId}`, { visible: true, timeout: 5000 });
    await page.waitForSelector(`#${runner.modalId} tbody tr`, { visible: true, timeout: 3000 });
    await page.waitForFunction(
      (modalId: string) => {
        const modal = document.querySelector(`#${modalId}`);
        if (!modal) return false;
        const firstRow = modal.querySelector('tbody tr');
        if (!firstRow) return false;
        const cells = firstRow.querySelectorAll('td');
        return cells[3]?.textContent?.trim().match(/\d+:\d+:\d+/) !== null;
      },
      { timeout: 5000 },
      runner.modalId
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract lap data
    const lapData = await page.evaluate((modalId: string) => {
      const modal = document.querySelector(`#${modalId}`);
      if (!modal) return [];

      const rows = Array.from(modal.querySelectorAll("tbody tr"));
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length < 6) return null;

        const lapText = cells[0].textContent || "";
        const lapMatch = lapText.match(/N°\s*(\d+)/);
        const lap = lapMatch ? parseInt(lapMatch[1], 10) : 0;

        const raceTime = cells[3].textContent?.trim() || "";
        const lapTime = cells[4].textContent?.trim() || "";
        const distText = cells[5].textContent?.trim() || "";

        return { lap, raceTime, lapTime, distance: distText };
      }).filter(Boolean);
    }, runner.modalId);

    const sortedLapData = [...lapData].sort((a: any, b: any) => a.lap - b.lap);
    const laps: any[] = [];

    for (let i = 0; i < sortedLapData.length; i++) {
      const lap: any = sortedLapData[i];

      let lapDistanceKm = 1.5;
      if (i > 0) {
        const currentDistance = parseDistance(lap.distance);
        const previousDistance = parseDistance(sortedLapData[i - 1].distance);
        lapDistanceKm = currentDistance - previousDistance;
      } else {
        lapDistanceKm = parseDistance(lap.distance);
      }

      const raceTimeSec = parseTime(lap.raceTime);
      const lapTimeSec = parseTime(lap.lapTime);
      const distanceKm = parseDistance(lap.distance);

      const lapPace = lapTimeSec > 0 && lapDistanceKm > 0
        ? lapTimeSec / lapDistanceKm
        : 0;

      const avgPace = raceTimeSec > 0 && distanceKm > 0
        ? raceTimeSec / distanceKm
        : 0;

      laps.push({
        race_id: raceId,
        bib: runner.bib,
        lap: lap.lap,
        lap_time_sec: lapTimeSec,
        race_time_sec: raceTimeSec,
        distance_km: distanceKm,
        rank: null,
        gender_rank: null,
        age_group_rank: null,
        lap_pace: lapPace,
        avg_pace: avgPace,
        timestamp: new Date().toISOString(),
      });
    }

    if (laps.length > 0) {
      const { error } = await supabase
        .from("race_laps")
        .upsert(laps, {
          onConflict: "race_id,bib,lap",
          ignoreDuplicates: false,
        });

      if (error) {
        console.log(`   ❌ Error inserting laps: ${error.message}`);
        return false;
      }

      console.log(`   ✅ Backfilled ${laps.length} laps for Bib ${bibNumber}`);
      return true;
    }

    return false;
  } catch (error) {
    console.log(`   ❌ Error processing Bib ${bibNumber}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return false;
  }
}

async function backfillGaps() {
  console.log("🚀 Starting gap backfill process...\n");

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

  console.log(`✅ Active race ID: ${activeRace.id}`);

  // Detect gaps
  const runnersWithGaps = await detectGaps(supabase, activeRace.id);

  if (runnersWithGaps.length === 0) {
    console.log("\n✅ No gaps found! All lap sequences are complete.");
    return;
  }

  console.log(`\n⚠️  Found ${runnersWithGaps.length} runners with missing laps`);
  console.log(`📊 Total missing laps: ${runnersWithGaps.reduce((sum, r) => sum + r.missingLaps.length, 0)}\n`);

  // Launch Puppeteer
  console.log("🌐 Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const url = "https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14";
    console.log(`📡 Navigating to ${url}...\n`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Get total pages
    const totalPages = await page.evaluate(() => {
      const pageLinks = Array.from(document.querySelectorAll('.pagination .page-link'));
      const pageNumbers = pageLinks
        .map(link => {
          const match = link.id.match(/page(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
    });

    console.log(`📄 Found ${totalPages} pages\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process each runner with gaps
    for (let i = 0; i < runnersWithGaps.length; i++) {
      const runner = runnersWithGaps[i];
      console.log(`\n[${i + 1}/${runnersWithGaps.length}] Processing Bib ${runner.bib} (${runner.missingLaps.length} missing laps)...`);

      const success = await backfillBib(browser, page, runner.bib, supabase, activeRace.id, totalPages);

      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Small delay between runners
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n\n🎉 Gap backfill complete!`);
    console.log(`   ✅ Success: ${successCount} runners`);
    console.log(`   ❌ Errors: ${errorCount} runners`);

  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    await browser.close();
  }
}

backfillGaps().catch(console.error);
