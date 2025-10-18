// Backfill lap data for a single bib using Puppeteer to scrape Breizh Chrono modals
import puppeteer from "puppeteer";
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
  return parseFloat(distStr.replace(",", ".").replace(" km", "").trim());
}

async function backfillSingleBib(bibNumber: number) {
  console.log(`🚀 Starting Puppeteer backfill for Bib ${bibNumber}...\n`);

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

  // Launch Puppeteer
  console.log("🌐 Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const url = "https://live.breizhchrono.com/external/live5/classements.jsp?reference=1384568432549-14";
    console.log(`📡 Navigating to ${url}...`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Find the runner with this bib number across all pages
    console.log(`🔍 Searching for Bib ${bibNumber} across all pages...`);

    // Determine total number of pages
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

    console.log(`   Searching ${totalPages} pages...\n`);

    let runnerFound = false;
    let runner: any = null;

    // Iterate through all pages to find the runner
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      // Call quickSearch() to load the page
      await page.evaluate((index) => {
        (window as any).quickSearch(index);
      }, pageIndex);

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Search for the bib on current page
      runner = await page.evaluate((bib) => {
        const runnerLinks = Array.from(document.querySelectorAll('a[href^="javascript:showDetails"]'));
        for (const link of runnerLinks) {
          const text = link.textContent || "";
          const bibMatch = text.match(/N°(\d+)/);
          if (bibMatch && parseInt(bibMatch[1], 10) === bib) {
            const detailsMatch = link.getAttribute("href")?.match(/showDetails\('([^']+)'\)/);
            return {
              bib: bib,
              modalId: detailsMatch ? detailsMatch[1] : null,
              name: text.split("-").slice(1).join("-").trim(),
            };
          }
        }
        return null;
      }, bibNumber);

      if (runner) {
        runnerFound = true;
        console.log(`✅ Found Bib ${bibNumber}: ${runner.name}`);
        break;
      }
    }

    if (!runnerFound || !runner) {
      console.log(`❌ Bib ${bibNumber} not found on timing system`);
      return;
    }

    // Click the runner link to open modal
    console.log(`📖 Opening modal for Bib ${bibNumber}...`);
    await page.evaluate((modalId) => {
      const link = document.querySelector(`a[href="javascript:showDetails('${modalId}')"]`) as HTMLElement;
      if (link) link.click();
    }, runner.modalId);

    // Wait for modal to be visible
    await page.waitForSelector(`#${runner.modalId}`, { visible: true, timeout: 5000 });

    // Wait for the table body to actually have data
    await page.waitForSelector(`#${runner.modalId} tbody tr`, { visible: true, timeout: 3000 });

    // Wait for the data to actually be populated (check if time cells have content)
    await page.waitForFunction(
      (modalId) => {
        const modal = document.querySelector(`#${modalId}`);
        if (!modal) return false;
        const firstRow = modal.querySelector('tbody tr');
        if (!firstRow) return false;
        const cells = firstRow.querySelectorAll('td');
        // Check if cell[3] (race time) has content with time format
        return cells[3]?.textContent?.trim().match(/\d+:\d+:\d+/) !== null;
      },
      { timeout: 5000 },
      runner.modalId
    );

    // Extra delay to be absolutely sure
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract lap data from modal
    const lapData = await page.evaluate((modalId) => {
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

        return {
          lap,
          raceTime,
          lapTime,
          distance: distText,
        };
      }).filter(Boolean);
    }, runner.modalId);

    console.log(`📊 Extracted ${lapData.length} laps for Bib ${bibNumber}`);

    // Sort laps by lap number
    const sortedLapData = [...lapData].sort((a: any, b: any) => a.lap - b.lap);

    // Parse and store lap data
    const laps: LapData[] = [];

    for (let i = 0; i < sortedLapData.length; i++) {
      const lap: any = sortedLapData[i];

      // Calculate actual lap distance (current distance - previous distance)
      let lapDistanceKm = 1.5; // Default standard lap distance

      if (i > 0) {
        // Not the first lap - calculate from distance difference
        const currentDistance = parseDistance(lap.distance);
        const previousDistance = parseDistance(sortedLapData[i - 1].distance);
        lapDistanceKm = currentDistance - previousDistance;
      } else {
        // First lap - use the distance itself (should be ~0.2 km)
        lapDistanceKm = parseDistance(lap.distance);
      }

      const raceTimeSec = parseTime(lap.raceTime);
      const lapTimeSec = parseTime(lap.lapTime);
      const distanceKm = parseDistance(lap.distance);

      // Lap pace in seconds per km
      const lapPace = lapTimeSec > 0 && lapDistanceKm > 0
        ? lapTimeSec / lapDistanceKm
        : 0;

      // Average pace in seconds per km
      const avgPace = raceTimeSec > 0 && distanceKm > 0
        ? raceTimeSec / distanceKm
        : 0;

      laps.push({
        bib: runner.bib!,
        lap: lap.lap,
        raceTimeSec,
        lapTimeSec,
        distanceKm,
        rank: null,
        genderRank: null,
      });
    }

    if (laps.length === 0) {
      console.log("❌ No lap data extracted!");
      return;
    }

    // Prepare for database
    const enrichedLaps = laps.map((lap, index) => {
      // Calculate actual lap distance (current distance - previous distance)
      let lapDistanceKm = 1.5; // Default standard lap distance

      if (index > 0) {
        // Not the first lap - calculate from distance difference
        lapDistanceKm = lap.distanceKm - laps[index - 1].distanceKm;
      } else {
        // First lap - use the distance itself (should be ~0.2 km)
        lapDistanceKm = lap.distanceKm;
      }

      // Lap pace in seconds per km
      const lapPace = lap.lapTimeSec > 0 && lapDistanceKm > 0
        ? lap.lapTimeSec / lapDistanceKm
        : 0;

      // Average pace in seconds per km
      const avgPace = lap.raceTimeSec > 0 && lap.distanceKm > 0
        ? lap.raceTimeSec / lap.distanceKm
        : 0;

      return {
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
      };
    });

    console.log(`💾 Inserting ${enrichedLaps.length} laps for Bib ${bibNumber}...`);

    const { error } = await supabase
      .from("race_laps")
      .upsert(enrichedLaps, {
        onConflict: "race_id,bib,lap",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`❌ Error inserting laps:`, error);
    } else {
      console.log(`✅ Successfully backfilled ${enrichedLaps.length} laps for Bib ${bibNumber}!`);
    }

  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    await browser.close();
  }
}

// Get bib number from command line
const bibArg = process.argv[2];
if (!bibArg) {
  console.error("❌ Usage: npx tsx scripts/backfill-single-bib.ts <bib_number>");
  console.error("   Example: npx tsx scripts/backfill-single-bib.ts 191");
  process.exit(1);
}

const bibNumber = parseInt(bibArg, 10);
if (isNaN(bibNumber)) {
  console.error("❌ Invalid bib number. Must be a number.");
  process.exit(1);
}

backfillSingleBib(bibNumber).catch(console.error);
