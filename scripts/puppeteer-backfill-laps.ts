// Backfill lap data using Puppeteer to scrape Breizh Chrono modals
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

async function backfillWithPuppeteer() {
  console.log("🚀 Starting Puppeteer backfill...\n");

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
    console.log(`📡 Navigating to ${url}...\n`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Get all runner rows with their bib numbers across ALL pages
    console.log("🔍 Finding all runners across all pagination pages...");

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

    console.log(`   Found ${totalPages} pages of runners\n`);

    const allLaps: any[] = [];
    let runnersProcessed = 0;

    // TEST MODE: Only process first runner (race leader)
    const TEST_MODE = true; // Set to true to test with just one runner
    const MAX_RUNNERS = TEST_MODE ? 1 : Infinity;

    // Iterate through all pages and process runners on each page
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (runnersProcessed >= MAX_RUNNERS) {
        console.log(`\n✅ Reached max runners limit (${MAX_RUNNERS}), stopping...`);
        break;
      }
      // Call quickSearch() to load the page
      await page.evaluate((index) => {
        (window as any).quickSearch(index);
      }, pageIndex);

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Extract runners from current page
      const runnersOnPage = await page.evaluate(() => {
        const runnerLinks = Array.from(document.querySelectorAll('a[href^="javascript:showDetails"]'));
        return runnerLinks.map((link) => {
          const text = link.textContent || "";
          const bibMatch = text.match(/N°(\d+)/);
          const detailsMatch = link.getAttribute("href")?.match(/showDetails\('([^']+)'\)/);
          return {
            bib: bibMatch ? parseInt(bibMatch[1], 10) : null,
            modalId: detailsMatch ? detailsMatch[1] : null,
            name: text.split("-").slice(1).join("-").trim(),
          };
        }).filter(r => r.bib !== null && r.modalId !== null);
      });

      console.log(`\n📄 Page ${pageIndex + 1}/${totalPages}: Processing ${runnersOnPage.length} runners...`);

      // Process each runner on this page
      for (const runner of runnersOnPage) {
      if (runnersProcessed >= MAX_RUNNERS) {
        break;
      }
      try {
        // Click the runner link to open modal
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

        // Parse and store lap data
        const laps: LapData[] = lapData.map((lap: any) => ({
          bib: runner.bib!,
          lap: lap.lap,
          raceTimeSec: parseTime(lap.raceTime),
          lapTimeSec: parseTime(lap.lapTime),
          distanceKm: parseDistance(lap.distance),
          rank: null,
          genderRank: null,
        }));

        if (laps.length > 0) {
          allLaps.push(...laps);
          runnersProcessed++;

          if (runnersProcessed <= 10) {
            console.log(`✅ Bib ${runner.bib} (${runner.name}): ${laps.length} laps`);
          } else if (runnersProcessed % 50 === 0) {
            console.log(`   ... processed ${runnersProcessed} runners so far`);
          }
        }

        // Close modal
        await page.evaluate((modalId) => {
          const closeBtn = document.querySelector(`#${modalId} button.close`) as HTMLElement;
          if (closeBtn) closeBtn.click();
        }, runner.modalId);

        // Small delay to avoid overwhelming the page
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing runner ${runner.bib}:`, error.message);
      }
      }

      console.log(`   Page ${pageIndex + 1} complete: ${runnersProcessed} total runners processed, ${allLaps.length} total laps`);
    }

    console.log(`\n✅ Extracted ${allLaps.length} laps from ${runnersProcessed} runners across ${totalPages} pages\n`);

    if (allLaps.length === 0) {
      console.log("❌ No lap data extracted!");
      return;
    }

    // Calculate paces and prepare for database
    const enrichedLaps = allLaps.map((lap) => {
      const lapPace = lap.lapTimeSec > 0 && lap.distanceKm > 0
        ? lap.lapTimeSec / (lap.distanceKm / 1.5) // Normalize to standard lap
        : 0;

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

    console.log(`💾 Inserting ${enrichedLaps.length} laps into database...`);

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < enrichedLaps.length; i += batchSize) {
      const batch = enrichedLaps.slice(i, i + batchSize);
      const { error } = await supabase
        .from("race_laps")
        .upsert(batch, {
          onConflict: "race_id,bib,lap",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
        break;
      }

      inserted += batch.length;
      console.log(`  ✅ Inserted ${inserted}/${enrichedLaps.length} laps...`);
    }

    console.log(`\n🎉 Successfully backfilled ${inserted} laps!`);

  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    await browser.close();
  }
}

backfillWithPuppeteer().catch(console.error);
