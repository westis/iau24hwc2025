// lib/live-race/breizh-chrono-adapter.ts
// Adapter for BreizhChrono live timing system
// Handles HTML scraping and JSON parsing

import type { LapTime, LeaderboardEntry } from "@/types/live-race";
import type { RaceDataSource } from "./data-adapter";

interface BreizhChronoRunnerData {
  bib: number;
  name: string;
  gender?: string;
  country?: string;
  rank?: number;
  distance?: number; // meters or km depending on format
  time?: string; // HH:MM:SS or seconds
  laps?: number;
  lastLapTime?: string;
}

export class BreizhChronoAdapter implements RaceDataSource {
  name = "BreizhChrono";

  constructor(private url: string) {}

  /**
   * Decode HTML entities (both named and numeric)
   * Handles: &nbsp; &amp; &#246; &#228; etc.
   */
  private decodeHtmlEntities(text: string): string {
    // First handle common named entities
    let decoded = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Then handle numeric entities (&#NNN; for decimal, &#xHH; for hex)
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    });
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    return decoded;
  }

  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      // BreizhChrono has pagination - fetch all pages
      const allEntries: LeaderboardEntry[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching page ${page}...`);

        try {
          const html = await this.fetchHtml(page);

          // Parse this page
          const entries = this.parseHtmlLeaderboard(html);
          console.log(`Page ${page}: found ${entries.length} entries`);

          if (entries.length === 0) {
            // No more results
            console.log(`No more results on page ${page}, stopping pagination`);
            hasMore = false;
          } else {
            allEntries.push(...entries);
            page++;

            // Add a small delay between requests to avoid rate limiting
            // Only delay if there are more pages to fetch
            if (hasMore && page > 0) {
              await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
            }

            // Safety limit to prevent infinite loops
            if (page > 50) {
              console.warn("Reached page limit of 50, stopping pagination");
              hasMore = false;
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching page ${page}:`, error);
          if (error instanceof Error) {
            console.error(`Error message: ${error.message}`);
            console.error(`Error stack: ${error.stack}`);
          }

          // If we failed on the first page, throw the error
          // Otherwise, return what we have so far
          if (page === 0) {
            console.error(`Failed on first page, rethrowing error`);
            throw error;
          } else {
            console.warn(`Stopping pagination at page ${page} due to error. Returning ${allEntries.length} entries.`);
            hasMore = false;
          }
        }
      }

      console.log(`✅ Fetched ${allEntries.length} total runners across ${page} pages`);
      return allEntries;
    } catch (error) {
      console.error("Error fetching BreizhChrono leaderboard:", error);
      throw error;
    }
  }

  async fetchLapData(): Promise<LapTime[]> {
    try {
      const html = await this.fetchHtml();

      // Try to extract lap data from JSON
      const jsonData = this.extractJsonData(html);
      if (jsonData && jsonData.length > 0) {
        return this.parseJsonLapData(jsonData);
      }

      // Try to parse lap data from HTML
      // Note: Many timing systems only show leaderboard, not individual laps
      return this.parseHtmlLapData(html);
    } catch (error) {
      console.error("Error fetching BreizhChrono lap data:", error);
      // Return empty array - lap calculation will be used instead
      return [];
    }
  }

  /**
   * Fetch detailed lap data for specific runners (from modals)
   * @param bibs Array of bib numbers to fetch lap details for
   */
  async fetchLapDataForRunners(bibs: number[]): Promise<LapTime[]> {
    const allLaps: LapTime[] = [];
    const referenceMatch = this.url.match(/reference=([^&]+)/);
    const reference = referenceMatch ? referenceMatch[1] : "";

    console.log(`Fetching lap details for ${bibs.length} runners...`);

    for (const bib of bibs) {
      try {
        // Fetch the modal/detail page for this runner
        // The modal content is in the main HTML with ID like "details0", "details1", etc.
        // We need to search the main HTML for the modal content
        const html = await this.fetchHtml(0);

        // Extract modal content for this runner's bib
        const laps = this.parseRunnerLapDetails(html, bib);
        if (laps.length > 0) {
          allLaps.push(...laps);
          console.log(`  Bib ${bib}: Found ${laps.length} laps`);
        }

        // Small delay to avoid rate limiting
        if (bibs.indexOf(bib) < bibs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error fetching laps for bib ${bib}:`, error);
      }
    }

    console.log(`✅ Fetched ${allLaps.length} total lap records for ${bibs.length} runners`);
    return allLaps;
  }

  /**
   * Parse individual lap details from modal/detail section for a specific runner
   */
  private parseRunnerLapDetails(html: string, bib: number): LapTime[] {
    const laps: LapTime[] = [];

    try {
      // Find all modal divs (they have IDs like "details0", "details1", etc.)
      const modalPattern = /<div[^>]*id=["']details\d+["'][^>]*>[\s\S]*?<\/div>/gi;
      const modals = html.match(modalPattern) || [];

      for (const modal of modals) {
        // Check if this modal contains our bib number
        if (!modal.includes(`N°${bib}`)) {
          continue;
        }

        // Find the lap table inside this modal
        // Look for table with lap data (typically has columns: Lap, Time, Pace, etc.)
        const lapTablePattern = /<table[^>]*>[\s\S]*?<\/table>/gi;
        const tables = modal.match(lapTablePattern) || [];

        for (const table of tables) {
          // Skip if not a lap table (should have "Tour" or "Lap" header)
          if (!table.includes("Tour") && !table.includes("Lap")) {
            continue;
          }

          // Extract rows
          const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          const rows = table.match(rowPattern) || [];

          let lapNumber = 0;
          for (const row of rows) {
            // Skip header rows
            if (row.includes("<th")) {
              continue;
            }

            // Extract cells
            const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            let match;

            while ((match = cellPattern.exec(row)) !== null) {
              // Remove HTML tags, decode entities, and trim
              const cellText = this.decodeHtmlEntities(
                match[1]
                  .replace(/<[^>]*>/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
              );
              cells.push(cellText);
            }

            if (cells.length >= 6) {
              lapNumber++;

              // BreizhChrono modal format:
              // cells[0] = Passage (lap#, e.g., "N° 105")
              // cells[1] = Classement (rank, e.g., "1er")
              // cells[2] = Clsmt Catégorie (category rank)
              // cells[3] = Temps global (cumulative race time, e.g., "11:41:53")
              // cells[4] = Dernier Temps (INDIVIDUAL lap time, e.g., "00:07:11")
              // cells[5] = Distance (cumulative distance, e.g., "157,5336 km")

              const raceTimeSec = this.parseTimeToSeconds(cells[3] || "0:00:00"); // Temps global
              const lapTimeSec = this.parseTimeToSeconds(cells[4] || "0:00:00");  // Dernier Temps
              const distanceStr = cells[5].replace(/[^\d,.]/g, "").replace(",", ".");
              const distanceKm = parseFloat(distanceStr) || 0;

              laps.push({
                bib,
                lap: lapNumber,
                lapTimeSec,     // ACTUAL lap duration from "Dernier Temps"
                raceTimeSec,    // Cumulative time from "Temps global"
                distanceKm,     // Cumulative distance
                rank: 0,
                genderRank: 0,
                ageGroupRank: 0,
                lapPace: 0,
                avgPace: 0,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }

        break; // Found the modal for this bib, no need to check others
      }
    } catch (error) {
      console.error(`Error parsing lap details for bib ${bib}:`, error);
    }

    return laps;
  }

  /**
   * Fetch HTML from BreizhChrono
   */
  private async fetchHtml(page: number = 0): Promise<string> {
    // Extract reference ID from URL if present
    const referenceMatch = this.url.match(/reference=([^&]+)/);
    const reference = referenceMatch ? referenceMatch[1] : "";

    // BreizhChrono uses a POST endpoint for data
    const endpoint = "https://live.breizhchrono.com/types/generic/custo/x.running/findInResults.jsp";

    // Build form data
    const formData = new URLSearchParams({
      inter: "",
      search: "",
      ville: "",
      course: "24h",
      sexe: "",
      category: "",
      reference: reference,
      from: "null",
      nofacebook: "1",
      version: "v6",
      page: page.toString(),
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        Referer: "https://live.breizhchrono.com/external/live5/classements.jsp",
        Origin: "https://live.breizhchrono.com",
      },
      body: formData.toString(),
      redirect: "follow",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Breizh Chrono error response (page ${page}, status ${response.status}):`, errorText.substring(0, 500));
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText} (page ${page})`
      );
    }

    const text = await response.text();

    // Log first fetch to verify we're getting data
    if (page === 0) {
      console.log(`First page response length: ${text.length} characters`);
      console.log(`First 200 chars:`, text.substring(0, 200));
    }

    // Check for error messages in HTML
    if (
      text.includes("ne sont pas encore disponibles") ||
      text.includes("not yet available")
    ) {
      throw new Error("Race results not yet available");
    }

    return text;
  }

  /**
   * Extract JSON data if embedded in HTML
   */
  private extractJsonData(html: string): any[] | null {
    try {
      // Look for common JSON patterns in timing system HTML
      const jsonPatterns = [
        /<script[^>]*>.*?var\s+(?:data|results|runners)\s*=\s*(\[.*?\]);/s,
        /<script[^>]*type="application\/json"[^>]*>(.*?)<\/script>/s,
        /window\.(?:data|results|runners)\s*=\s*(\[.*?\]);/s,
      ];

      for (const pattern of jsonPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const data = JSON.parse(match[1]);
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
      }
    } catch (error) {
      console.log("No JSON data found or parsing failed:", error);
    }
    return null;
  }

  /**
   * Parse leaderboard from HTML table
   * This is a best-effort parser that tries to handle common table structures
   */
  private parseHtmlLeaderboard(html: string): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    try {
      // BreizhChrono specific: Find table containing showDetails links
      // Main table has links like: <a href="javascript:showDetails('details0')">
      // Modal tables don't have these links
      const mainTableMatch = html.match(
        /<table[^>]*>[\s\S]*?<th>Clsmt\.<\/th>[\s\S]*?showDetails[\s\S]*?<\/table>/i
      );

      if (!mainTableMatch) {
        console.log("Could not find main leaderboard table");
        return [];
      }

      const mainTableHtml = mainTableMatch[0];

      // Use regex to extract table rows from main table only
      const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      const rows = mainTableHtml.match(tableRowPattern) || [];

      let rank = 0;
      const timestamp = new Date().toISOString();

      for (const row of rows) {
        // Skip header rows
        if (row.includes("<th") || row.includes("thead")) {
          continue;
        }

        // Extract cells
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells: string[] = [];
        let match;

        while ((match = cellPattern.exec(row)) !== null) {
          // Remove HTML tags, decode entities, and trim
          const cellText = this.decodeHtmlEntities(
            match[1]
              .replace(/<[^>]*>/g, "")
              .replace(/\s+/g, " ") // Collapse multiple spaces
              .trim()
          );
          cells.push(cellText);
        }

        // Need at least: bib, name, distance, time
        if (cells.length < 4) {
          continue;
        }

        try {
          rank++;

          // Breizh Chrono specific format:
          // cells[0] = rank (e.g. "1")
          // cells[1] = "N°191 - RUEGER Pascal"
          // cells[2] = laps (e.g. "4")
          // cells[3] = last passage time (e.g. "10:24:35")
          // cells[4] = distance (e.g. "6.00128 km")

          if (cells.length >= 5) {
            const entry = this.parseBreizhChronoRow(cells, rank, timestamp);
            if (entry && entry.bib > 0) {
              entries.push(entry);
            }
          }
        } catch (error) {
          console.log("Error parsing table row:", error, cells);
        }
      }
    } catch (error) {
      console.error("Error parsing HTML leaderboard:", error);
    }

    return entries;
  }

  /**
   * Parse Breizh Chrono specific table row
   * Format: [rank, "N°XXX - Name", laps, time, distance]
   */
  private parseBreizhChronoRow(
    cells: string[],
    rank: number,
    timestamp: string
  ): LeaderboardEntry | null {
    try {
      // cells[1] contains "N°191 - RUEGER Pascal"
      const bibNameMatch = cells[1].match(/N°(\d+)\s*-\s*(.+)/);
      if (!bibNameMatch) {
        console.log("Could not extract bib/name from:", cells[1]);
        return null;
      }

      const bib = parseInt(bibNameMatch[1]);
      const name = bibNameMatch[2].trim();
      const laps = parseInt(cells[2]) || 0;
      const clockTimeStr = cells[3] || "00:00:00"; // This is clock time (e.g., "10:24:35"), not elapsed time
      const distanceStr = cells[4].replace(/[^\d,.]/g, "").replace(",", "."); // Remove "km", handle commas
      let distanceKm = parseFloat(distanceStr) || 0;

      // Create last_passing timestamp from clock time + today's date
      const lastPassing = this.parseClockTimeToTimestamp(clockTimeStr);

      // Note: raceTimeSec will be calculated in the cron route based on race start time
      // For now, just use 0 as placeholder
      const raceTimeSec = 0;

      // Calculate pace (will be recalculated with correct race time in cron route)
      const lapTimeSec = laps > 0 ? raceTimeSec / laps : 0;
      const lapPaceSec = distanceKm > 0 ? raceTimeSec / distanceKm : 0;

      return {
        bib,
        name,
        rank,
        genderRank: 0, // Will be calculated later
        distanceKm,
        projectedKm: 0, // Will be calculated
        raceTimeSec,
        lapPaceSec,
        lapTimeSec,
        lap: laps,
        gender: "m" as "m" | "w", // Will be matched with our database
        timestamp,
        country: "XXX", // Will be matched with our database
        lastPassing, // Clock time converted to timestamp
      };
    } catch (error) {
      console.error("Error parsing Breizh Chrono row:", error);
      return null;
    }
  }

  /**
   * Parse a table row into a LeaderboardEntry
   * Attempts to intelligently detect column positions
   */
  private parseTableRow(
    cells: string[],
    rank: number,
    timestamp: string
  ): LeaderboardEntry | null {
    try {
      // Try to detect bib (usually a number, often first or second column)
      let bibIndex = -1;
      let nameIndex = -1;
      let distanceIndex = -1;
      let timeIndex = -1;
      let lapsIndex = -1;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        // BreizhChrono specific: Check for "N°XXX - Name" format FIRST
        if (bibIndex === -1 && nameIndex === -1 && cell.match(/N°(\d+)\s*-/)) {
          bibIndex = i;
          nameIndex = i; // Same cell contains both
        }
        // Bib is usually a 1-3 digit number
        else if (bibIndex === -1 && /^\d{1,4}$/.test(cell)) {
          bibIndex = i;
        }
        // Name contains letters and possibly spaces (but not N° format)
        else if (
          nameIndex === -1 &&
          /[a-zA-ZÀ-ÿ]{2,}/.test(cell) &&
          cell.length > 2 &&
          !cell.includes("N°")
        ) {
          nameIndex = i;
        }
        // Distance might be like "45.5" or "45.5 km"
        else if (distanceIndex === -1 && /^\d+\.?\d*\s*(km|m)?$/i.test(cell)) {
          distanceIndex = i;
        }
        // Time is HH:MM:SS or H:MM:SS
        else if (timeIndex === -1 && /\d{1,2}:\d{2}:\d{2}/.test(cell)) {
          timeIndex = i;
        }
        // Laps is a number (but not distance)
        else if (lapsIndex === -1 && /^\d+$/.test(cell) && parseInt(cell) > 0 && parseInt(cell) < 100) {
          lapsIndex = i;
        }
      }

      // Must have at least bib, name, and either distance or laps
      if (bibIndex === -1 || nameIndex === -1) {
        return null;
      }

      // Extract bib and name (might be in same cell as "N°XXX - Name")
      let bib: number;
      let name: string;

      const bibNameMatch = cells[bibIndex].match(/N°(\d+)\s*-\s*(.+)/);
      if (bibNameMatch) {
        bib = parseInt(bibNameMatch[1]);
        name = bibNameMatch[2].trim();
      } else {
        bib = parseInt(cells[bibIndex]);
        name = cells[nameIndex];
      }
      const distance =
        distanceIndex !== -1 ? parseFloat(cells[distanceIndex]) : 0;
      const laps = lapsIndex !== -1 ? parseInt(cells[lapsIndex]) : 0;
      const timeStr = timeIndex !== -1 ? cells[timeIndex] : "00:00:00";
      const raceTimeSec = this.parseTimeToSeconds(timeStr);

      // Estimate distance if only laps are given
      let distanceKm = distance;
      if (distanceKm === 0 && laps > 0) {
        // First lap = 0.1km, subsequent laps = 1.5km each
        distanceKm = 0.1 + (laps - 1) * 1.5;
      }

      // If distance is in meters, convert to km
      if (distanceKm > 100) {
        distanceKm = distanceKm / 1000;
      }

      const lapTimeSec = laps > 0 ? raceTimeSec / laps : 0;
      const lapPaceSec = distanceKm > 0 ? raceTimeSec / distanceKm : 0;

      return {
        bib,
        name,
        rank,
        genderRank: 0, // Will be calculated later
        distanceKm,
        projectedKm: 0, // Will be calculated
        raceTimeSec,
        lapPaceSec,
        lapTimeSec,
        lap: laps,
        gender: "m" as "m" | "w", // Will be matched with our database
        timestamp,
        country: "XXX", // Will be matched with our database
      };
    } catch (error) {
      console.error("Error parsing table row:", error);
      return null;
    }
  }

  /**
   * Parse JSON leaderboard data from timing system
   */
  private parseJsonLeaderboard(data: any[]): LeaderboardEntry[] {
    const timestamp = new Date().toISOString();

    return data
      .map((item, index) => {
        try {
          const bib = this.extractNumber(item, ["bib", "dossard", "number"]);
          const name = this.extractString(item, [
            "name",
            "nom",
            "runner",
            "athlete",
          ]);
          const distance = this.extractNumber(item, ["distance", "dist", "km"]);
          const time = this.extractString(item, ["time", "temps", "duration"]);
          const laps = this.extractNumber(item, ["laps", "tours", "lap"]);

          if (!bib || !name) return null;

          const raceTimeSec = time ? this.parseTimeToSeconds(time) : 0;
          let distanceKm = distance || 0;

          // Estimate distance from laps if needed
          if (distanceKm === 0 && laps > 0) {
            distanceKm = 0.1 + (laps - 1) * 1.5;
          }

          // Convert meters to km if needed
          if (distanceKm > 100) {
            distanceKm = distanceKm / 1000;
          }

          const lapTimeSec = laps > 0 ? raceTimeSec / laps : 0;
          const lapPaceSec = distanceKm > 0 ? raceTimeSec / distanceKm : 0;

          return {
            bib,
            name,
            rank: index + 1,
            genderRank: 0,
            distanceKm,
            projectedKm: 0,
            raceTimeSec,
            lapPaceSec,
            lapTimeSec,
            lap: laps || 0,
            gender: "m" as "m" | "w",
            timestamp,
            country: "XXX",
          };
        } catch (error) {
          console.error("Error parsing JSON item:", error);
          return null;
        }
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null);
  }

  /**
   * Parse lap data from HTML (if available)
   * Most timing systems don't provide this in leaderboard view
   */
  private parseHtmlLapData(html: string): LapTime[] {
    // BreizhChrono typically doesn't show individual laps in the leaderboard view
    // Return empty array - lap calculation will handle this
    return [];
  }

  /**
   * Parse lap data from JSON (if available)
   */
  private parseJsonLapData(data: any[]): LapTime[] {
    // Check if data includes lap-by-lap information
    // Most leaderboard endpoints don't include this
    return [];
  }

  /**
   * Helper: Parse time string (HH:MM:SS or H:MM:SS) to seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(":");
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Helper: Convert clock time (HH:MM:SS) to ISO timestamp using today's date in Europe/Paris timezone
   * Breizh Chrono returns clock time like "10:24:35" in France local time
   * Handles midnight boundary: if clock time appears to be >12h in the past, assumes next day
   */
  private parseClockTimeToTimestamp(clockTimeStr: string): string {
    const parts = clockTimeStr.split(":");
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;

      // Get current time
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const day = now.getUTCDate();

      // Create date string with today's date in Europe/Paris time (UTC+2 in October)
      // Format: YYYY-MM-DDTHH:MM:SS+02:00
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}+02:00`;

      let timestamp = new Date(dateStr);
      const nowTime = now.getTime();
      const timestampTime = timestamp.getTime();

      // MIDNIGHT BOUNDARY FIX:
      // If the created timestamp is more than 12 hours in the past,
      // the clock time must be from tomorrow (race crossed midnight)
      // Example: Current time 23:45, clock time 00:30 → 00:30 is tomorrow, not 23h ago
      const diffHours = (nowTime - timestampTime) / (1000 * 60 * 60);

      if (diffHours > 12) {
        // Add 1 day - clock time is from tomorrow
        timestamp = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);
        console.log(`⏰ Midnight rollover detected: clock time ${clockTimeStr} adjusted to next day`);
      } else if (diffHours < -12) {
        // Subtract 1 day - clock time was from yesterday (edge case)
        timestamp = new Date(timestamp.getTime() - 24 * 60 * 60 * 1000);
        console.log(`⏰ Reverse rollover detected: clock time ${clockTimeStr} adjusted to previous day`);
      }

      return timestamp.toISOString();
    }
    return new Date().toISOString();
  }

  /**
   * Helper: Extract number from object with multiple possible keys
   */
  private extractNumber(obj: any, keys: string[]): number {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const num = parseFloat(obj[key]);
        if (!isNaN(num)) return num;
      }
    }
    return 0;
  }

  /**
   * Helper: Extract string from object with multiple possible keys
   */
  private extractString(obj: any, keys: string[]): string {
    for (const key of keys) {
      if (obj[key] && typeof obj[key] === "string") {
        return obj[key].trim();
      }
    }
    return "";
  }
}
