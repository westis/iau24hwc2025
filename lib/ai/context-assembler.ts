// lib/ai/context-assembler.ts
// Assembles context for AI commentary generation (optimized for minimal token usage)

import { createClient } from "@/lib/supabase/server";
import type {
  RaceEvent,
  CommentaryContext,
  LeaderboardEntry,
  LapTime,
} from "@/types/live-race";

/**
 * Assemble context for an individual event commentary
 * Keeps context lean to minimize AI costs
 */
export async function assembleEventContext(
  event: RaceEvent
): Promise<CommentaryContext> {
  const supabase = await createClient();

  // Get race info for timing
  const { data: race } = await supabase
    .from("race_info")
    .select("start_time, end_time")
    .eq("id", event.raceId)
    .single();

  const now = new Date();
  const startTime = new Date(race!.start_time);
  const elapsedMs = now.getTime() - startTime.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const raceHour = Math.floor(elapsedHours);

  const context: CommentaryContext = {
    currentTime: now.toISOString(),
    raceHour,
    elapsedHours,
    event,
  };

  // Add runner-specific context if event involves specific runners
  if (event.relatedBibs && event.relatedBibs.length > 0) {
    const mainBib = event.relatedBibs[0];

    // Get runner notes (from database)
    const runnerNotes = await getRunnerNotes(supabase, mainBib);
    if (runnerNotes) {
      context.runnerNotes = runnerNotes;
    }

    // Get personal best from runner data
    const pb = await getRunnerPersonalBest(supabase, mainBib);
    if (pb) {
      context.personalBest = pb;
    }
  }

  // For certain event types, add team standings
  if (
    event.eventType === "break_started" ||
    event.eventType === "break_ended" ||
    event.eventType === "lead_change" ||
    event.relatedCountries.some(c => ["SWE", "NOR", "DEN", "FIN"].includes(c))
  ) {
    const teams = await getRelevantTeamStandings(supabase, event.raceId, event.relatedCountries);
    if (teams.length > 0) {
      context.teamStandings = teams;
    }
  }

  return context;
}

/**
 * Assemble context for hourly summary
 * More comprehensive than event context
 */
export async function assembleHourlySummaryContext(
  raceId: number
): Promise<{
  raceHour: number;
  elapsedHours: number;
  recentEvents: RaceEvent[];
  menLeaders: LeaderboardEntry[];
  womenLeaders: LeaderboardEntry[];
  menTeams: Array<{ country: string; total: number; rank: number }>;
  womenTeams: Array<{ country: string; total: number; rank: number }>;
  swedenRunners: LeaderboardEntry[];
  currentTime: string;
}> {
  const supabase = await createClient();

  // Get race timing
  const { data: race } = await supabase
    .from("race_info")
    .select("start_time")
    .eq("id", raceId)
    .single();

  const now = new Date();
  const startTime = new Date(race!.start_time);
  const elapsedMs = now.getTime() - startTime.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const raceHour = Math.floor(elapsedHours);

  // Get events from last hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const { data: recentEventsData } = await supabase
    .from("race_events")
    .select("*")
    .eq("race_id", raceId)
    .gte("timestamp", oneHourAgo.toISOString())
    .order("timestamp", { ascending: false });

  const recentEvents: RaceEvent[] = (recentEventsData || []).map((e: any) => ({
    id: e.id,
    raceId: e.race_id,
    eventType: e.event_type,
    priority: e.priority,
    relatedBibs: e.related_bibs || [],
    relatedCountries: e.related_countries || [],
    eventData: e.event_data,
    commentaryGenerated: e.commentary_generated,
    commentaryId: e.commentary_id,
    timestamp: e.timestamp,
    createdAt: e.created_at,
  }));

  // Get current leaderboard
  const { data: leaderboardData } = await supabase
    .from("race_leaderboard")
    .select("*")
    .eq("race_id", raceId)
    .order("rank", { ascending: true });

  const leaderboard: LeaderboardEntry[] = (leaderboardData || []).map((e: any) => ({
    bib: e.bib,
    name: e.name,
    rank: e.rank,
    genderRank: e.gender_rank,
    distanceKm: e.distance_km,
    projectedKm: e.projected_km,
    raceTimeSec: e.race_time_sec,
    lapPaceSec: e.lap_pace_sec,
    lapTimeSec: e.lap_time_sec,
    lap: e.lap,
    gender: e.gender,
    timestamp: e.timestamp,
    country: e.country,
    trend: e.trend,
    lastPassing: e.last_passing,
  }));

  // Top 5 men and women
  const menLeaders = leaderboard.filter(r => r.gender === "m").slice(0, 5);
  const womenLeaders = leaderboard.filter(r => r.gender === "w").slice(0, 5);

  // Team standings
  const menTeams = await getTopTeamStandings(supabase, raceId, "m", 5);
  const womenTeams = await getTopTeamStandings(supabase, raceId, "w", 5);

  // Swedish runners
  const swedenRunners = leaderboard.filter(r => r.country === "SWE");

  return {
    raceHour,
    elapsedHours,
    recentEvents,
    menLeaders,
    womenLeaders,
    menTeams,
    womenTeams,
    swedenRunners,
    currentTime: now.toISOString(),
  };
}

/**
 * Get runner notes from database
 */
async function getRunnerNotes(supabase: any, bib: number): Promise<string | null> {
  // First get runner ID from leaderboard
  const { data: runnerData } = await supabase
    .from("race_leaderboard")
    .select("bib")
    .eq("bib", bib)
    .single();

  if (!runnerData) return null;

  // Get runner from main runners table to find ID
  const { data: runner } = await supabase
    .from("runners")
    .select("id")
    .eq("bib", bib)
    .single();

  if (!runner) return null;

  // Get notes
  const { data: notes } = await supabase
    .from("runner_notes")
    .select("note_text")
    .eq("runner_id", runner.id)
    .order("created_at", { ascending: false })
    .limit(1);

  return notes && notes.length > 0 ? notes[0].note_text : null;
}

/**
 * Get runner's personal best from all_pbs column
 */
async function getRunnerPersonalBest(supabase: any, bib: number): Promise<number | null> {
  const { data: runner } = await supabase
    .from("runners")
    .select("all_pbs")
    .eq("bib", bib)
    .single();

  if (!runner || !runner.all_pbs) return null;

  // Extract 24h PB from all_pbs JSON
  try {
    const pbs = runner.all_pbs;
    if (pbs["24h"]) {
      return parseFloat(pbs["24h"].distance_km);
    }
  } catch (e) {
    console.error("Error parsing PBs:", e);
  }

  return null;
}

/**
 * Get team standings for relevant countries
 */
async function getRelevantTeamStandings(
  supabase: any,
  raceId: number,
  countries: string[]
): Promise<Array<{
  country: string;
  rank: number;
  total: number;
  runners: LeaderboardEntry[];
}>> {
  const { data: leaderboardData } = await supabase
    .from("race_leaderboard")
    .select("*")
    .eq("race_id", raceId)
    .in("country", countries);

  if (!leaderboardData) return [];

  const leaderboard: LeaderboardEntry[] = leaderboardData.map((e: any) => ({
    bib: e.bib,
    name: e.name,
    rank: e.rank,
    genderRank: e.gender_rank,
    distanceKm: e.distance_km,
    projectedKm: e.projected_km,
    raceTimeSec: e.race_time_sec,
    lapPaceSec: e.lap_pace_sec,
    lapTimeSec: e.lap_time_sec,
    lap: e.lap,
    gender: e.gender,
    timestamp: e.timestamp,
    country: e.country,
  }));

  // Group by country and calculate totals
  const teamMap = new Map<string, LeaderboardEntry[]>();
  for (const runner of leaderboard) {
    if (!teamMap.has(runner.country)) {
      teamMap.set(runner.country, []);
    }
    teamMap.get(runner.country)!.push(runner);
  }

  const teams: Array<{ country: string; total: number; runners: LeaderboardEntry[] }> = [];
  for (const [country, runners] of teamMap) {
    // Take top 3 runners for team total (standard 24h team scoring)
    const topRunners = runners
      .sort((a, b) => b.distanceKm - a.distanceKm)
      .slice(0, 3);
    const total = topRunners.reduce((sum, r) => sum + r.distanceKm, 0);
    teams.push({ country, total, runners: topRunners });
  }

  // Sort by total and add rank
  teams.sort((a, b) => b.total - a.total);
  return teams.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}

/**
 * Get top N team standings by gender
 */
async function getTopTeamStandings(
  supabase: any,
  raceId: number,
  gender: "m" | "w",
  topN: number
): Promise<Array<{ country: string; total: number; rank: number }>> {
  const { data: leaderboardData } = await supabase
    .from("race_leaderboard")
    .select("country, distance_km")
    .eq("race_id", raceId)
    .eq("gender", gender);

  if (!leaderboardData) return [];

  // Group by country
  const teamMap = new Map<string, number[]>();
  for (const runner of leaderboardData) {
    if (!teamMap.has(runner.country)) {
      teamMap.set(runner.country, []);
    }
    teamMap.get(runner.country)!.push(runner.distance_km);
  }

  // Calculate team totals (top 3 per country)
  const teams: Array<{ country: string; total: number }> = [];
  for (const [country, distances] of teamMap) {
    const topDistances = distances.sort((a, b) => b - a).slice(0, 3);
    const total = topDistances.reduce((sum, d) => sum + d, 0);
    teams.push({ country, total });
  }

  // Sort and add rank
  teams.sort((a, b) => b.total - a.total);
  return teams.slice(0, topN).map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}
