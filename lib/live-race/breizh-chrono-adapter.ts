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

  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const html = await this.fetchHtml();

      // Try to extract JSON data first (some timing systems embed it)
      const jsonData = this.extractJsonData(html);
      if (jsonData && jsonData.length > 0) {
        return this.parseJsonLeaderboard(jsonData);
      }

      // Fall back to HTML parsing
      return this.parseHtmlLeaderboard(html);
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
   * Fetch HTML from BreizhChrono
   */
  private async fetchHtml(): Promise<string> {
    const response = await fetch(this.url, {
      headers: {
        "User-Agent": "IAU 24H World Championship App (Live Tracking)",
        Accept: "text/html,application/json,*/*",
      },
      // Don't follow redirects to error pages
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    const text = await response.text();

    // Check for error messages in HTML
    if (
      text.includes("ne sont pas encore disponibles") ||
      text.includes("not yet available") ||
      text.includes("résultats") === false
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
      // Use regex to extract table rows
      // This is basic parsing - cheerio would be more robust
      const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      const rows = html.match(tableRowPattern) || [];

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
          // Remove HTML tags and trim
          const cellText = match[1]
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();
          cells.push(cellText);
        }

        // Need at least: bib, name, distance, time
        if (cells.length < 4) {
          continue;
        }

        try {
          rank++;

          // Parse runner data - adjust indices based on actual table structure
          // Common formats:
          // [Rank, Bib, Name, Laps, Distance, Time, ...]
          // [Bib, Name, Country, Distance, Time, Laps, ...]
          const entry = this.parseTableRow(cells, rank, timestamp);

          if (entry && entry.bib > 0) {
            entries.push(entry);
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

        // Bib is usually a 1-3 digit number
        if (bibIndex === -1 && /^\d{1,4}$/.test(cell)) {
          bibIndex = i;
        }
        // Name contains letters and possibly spaces
        else if (
          nameIndex === -1 &&
          /[a-zA-ZÀ-ÿ]{2,}/.test(cell) &&
          cell.length > 2
        ) {
          nameIndex = i;
        }
        // Distance might be like "45.5" or "45.5 km"
        else if (distanceIndex === -1 && /\d+\.?\d*\s*(km|m)?/i.test(cell)) {
          distanceIndex = i;
        }
        // Time is HH:MM:SS or H:MM:SS
        else if (timeIndex === -1 && /\d{1,2}:\d{2}:\d{2}/.test(cell)) {
          timeIndex = i;
        }
        // Laps is a number
        else if (lapsIndex === -1 && /^\d+$/.test(cell) && parseInt(cell) > 0) {
          lapsIndex = i;
        }
      }

      // Must have at least bib, name, and either distance or laps
      if (bibIndex === -1 || nameIndex === -1) {
        return null;
      }

      const bib = parseInt(cells[bibIndex]);
      const name = cells[nameIndex];
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
        gender: "m", // Will be matched with our database
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
            gender: "m" as const,
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
