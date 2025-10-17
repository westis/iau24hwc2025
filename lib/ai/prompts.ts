// lib/ai/prompts.ts
// Swedish commentary prompts matching ultramarathon.se style

import type { RaceEvent, CommentaryContext } from "@/types/live-race";

/**
 * System prompt - defines the AI's role and style
 */
export const SYSTEM_PROMPT = `Du är en erfaren ultramaratonkommentator för ultramarathon.se, Sveriges ledande ultramarathonsite. Din uppgift är att ge insiktsfull, engagerande livekommentar under IAU 24-timmars VM 2025 i Albi, Frankrike.

STIL OCH TON:
- Analytisk men tillgänglig - som i förhandsartiklarna på ultramarathon.se
- Fokusera på "varför" snarare än bara "vad"
- Humanisera löparna - nämn bakgrund, strategier, personliga omständigheter när relevant
- Skapa narrativ spänning - vad betyder detta för medaljkampen?
- Balansera fakta med spekulerad strategi och taktik
- Var koncis - 2-4 meningar för vanliga händelser, max 6-7 meningar för sammanfattningar
- Använd naturlig, konverserande svenska (inte formell nyhetssvenska)

PRIORITERINGAR:
1. Top 3-5 herrar och damer
2. Svenska laget (alla löpare - särskilt viktigt!)
3. Norge, Danmark, Finland
4. Lagkamper mellan top-länderna
5. Oväntat starka prestationer eller dramatiska förändringar
6. Strategiska val och taktiska beslut

UNDVIK:
- Robotaktiga uppdateringar ("X passerade mattan kl 14:23")
- Att upprepa uppenbara fakta från resultatlistan
- Överdriven positivitet - var objektiv och analytisk
- Långrandiga analyser - kom till poängen snabbt
- Att spekulera utan grund - håll dig till data när du inte har kontext

TIDSFASER (viktigt att anpassa kommentaren):
- Timme 0-6: Tidigt skede - fokus på pacing-strategier, vem som är konservativ/aggressiv
- Timme 6-12: Mittskede - pausmönster viktiga, vem följer sin plan
- Timme 12-18: Kritiskt skede - mental tuffhet, vem håller ihop
- Timme 18-24: Slutskede - dramatik, sista spurt, lagkamper avgörs

När du kommenterar en händelse, tänk alltid: "Vad är det INTRESSANTA här? Vad skulle en erfaren 24-timmarsbevakar vilja veta?"`;

/**
 * Build prompt for a specific event
 */
export function buildEventPrompt(event: RaceEvent, context: CommentaryContext): string {
  const eventData = event.eventData;

  switch (event.eventType) {
    case "break_started":
      return buildBreakStartedPrompt(eventData, context);
    case "break_ended":
      return buildBreakEndedPrompt(eventData, context);
    case "lead_change":
      return buildLeadChangePrompt(eventData, context);
    case "significant_move":
      return buildSignificantMovePrompt(eventData, context);
    case "pace_surge":
    case "pace_drop":
      return buildPaceChangePrompt(eventData, context, event.eventType);
    case "record_pace":
      return buildRecordPacePrompt(eventData, context);
    default:
      return buildGenericEventPrompt(event, context);
  }
}

function buildBreakStartedPrompt(data: any, context: CommentaryContext): string {
  const runner = data.runner;
  const timeSince = Math.floor(data.timeSinceLastLap / (1000 * 60)); // minutes

  let prompt = `PAUS STARTAD - Timme ${context.raceHour} av 24

Löpare: ${runner.name} (${runner.country})
Nuvarande placering: ${runner.rank}:a totalt, ${runner.genderRank}:a ${runner.gender === "m" ? "herr" : "dam"}
Distans: ${runner.distanceKm.toFixed(2)} km
Tid sedan senaste varv: ${timeSince} minuter
`;

  if (context.personalBest) {
    prompt += `Personligt rekord 24h: ${context.personalBest} km\n`;
  }

  if (context.runnerNotes) {
    prompt += `Bakgrund/noter: ${context.runnerNotes}\n`;
  }

  if (context.teamStandings && context.teamStandings.length > 0) {
    const team = context.teamStandings.find(t => t.country === runner.country);
    if (team) {
      prompt += `Lagställning ${runner.country}: ${team.rank}:a, totalt ${team.total.toFixed(2)} km\n`;
    }
  }

  prompt += `\nSkriv en kort, analytisk kommentar (2-3 meningar) som:
1. Konstaterar pausen och kontextualiserar timingen
2. Analyserar om detta verkar strategiskt (baserat på tidsläge i loppet och position)
3. Spekulerar kort om påverkan på individuell placering OCH lagresultat om relevant

Tänk på vilken timme det är i loppet - är detta en naturlig pausperiod eller oväntat?`;

  return prompt;
}

function buildBreakEndedPrompt(data: any, context: CommentaryContext): string {
  const runner = data.runner;
  const duration = Math.floor(data.breakDuration / (1000 * 60)); // minutes

  return `PAUS AVSLUTAD - Timme ${context.raceHour} av 24

Löpare: ${runner.name} (${runner.country})
Pauslängd: ${duration} minuter
Nuvarande placering efter återkomst: ${runner.rank}:a totalt
Distans: ${runner.distanceKm.toFixed(2)} km

Skriv en kort kommentar (2 meningar) som:
1. Välkomnar tillbaka löparen
2. Bedömer om pauslängden var rimlig eller lång/kort, och vad som väntar framöver

Håll ton positiv men realistisk om deras chanser.`;
}

function buildLeadChangePrompt(data: any, context: CommentaryContext): string {
  const { newLeader, oldLeader, gap, gender } = data;
  const genderText = gender === "m" ? "herrklassen" : "damklassen";

  let prompt = `LEDNINGSBYTE I ${genderText.toUpperCase()}! - Timme ${context.raceHour} av 24

NY LEDARE: ${newLeader.name} (${newLeader.country})
- Distans: ${newLeader.distanceKm.toFixed(2)} km
- Försprång: ${gap.toFixed(2)} km

TIDIGARE LEDARE: ${oldLeader.name} (${oldLeader.country})
- Nuvarande distans: ${oldLeader.distanceKm.toFixed(2)} km
`;

  if (context.personalBest) {
    prompt += `\nNy ledares PB: ${context.personalBest} km`;
  }

  prompt += `\nSkriv en dramatisk men analytisk kommentar (3-4 meningar) som:
1. Annonserar bytet med energi
2. Förklarar HUR bytet skedde (pace-skillnad, paus, strategisk?)
3. Analyserar vad detta betyder för resten av loppet
4. Nämn historisk kontext om du har PB eller annan relevant info

Detta är VIKTIGT - ge det den uppmärksamhet det förtjänar!`;

  return prompt;
}

function buildSignificantMovePrompt(data: any, context: CommentaryContext): string {
  const { runner, oldRank, newRank, positionsGained } = data;
  const direction = positionsGained > 0 ? "uppåt" : "nedåt";
  const positions = Math.abs(positionsGained);

  return `STOR FÖRFLYTTNING - Timme ${context.raceHour} av 24

Löpare: ${runner.name} (${runner.country})
Förflyttning: ${direction} ${positions} placeringar
Från: ${oldRank}:a → Till: ${newRank}:a
Distans: ${runner.distanceKm.toFixed(2)} km
${runner.trend ? `Trend: ${runner.trend}` : ""}

Skriv en engagerande kommentar (2-3 meningar) som:
1. Lyfter förflyttningen
2. Spekulerar om orsaken (pace-ökning, andra pausar, strategiskt?)
3. Bedömer om detta är hållbart eller en tillfällig spike

Skapa momentum och spänning!`;
}

function buildPaceChangePrompt(
  data: any,
  context: CommentaryContext,
  type: "pace_surge" | "pace_drop"
): string {
  const { runner, recentLapPace, avgPace, percentChange, direction } = data;
  const change = type === "pace_surge" ? "ÖKAT TEMPO" : "SÄNKT TEMPO";

  return `${change} - Timme ${context.raceHour} av 24

Löpare: ${runner.name} (${runner.country})
Placering: ${runner.rank}:a
Senaste varvtempo: ${Math.floor(recentLapPace / 60)} min/km
Genomsnittlig pace: ${Math.floor(avgPace / 60)} min/km
Förändring: ${percentChange.toFixed(1)}% ${direction === "faster" ? "snabbare" : "långsammare"}
Distans: ${runner.distanceKm.toFixed(2)} km

Skriv en kommentar (2-3 meningar) som:
1. Noterar tempoförändringen
2. Tolkar om detta är taktiskt smart eller problematiskt (baserat på tidsläge i loppet)
3. Spekulerar om påverkan på placering framöver

Var objektiv - snabbare är inte alltid bättre i 24-timmars!`;
}

function buildRecordPacePrompt(data: any, context: CommentaryContext): string {
  const { runner, projectedDistance, recordThreshold, gender } = data;
  const genderText = gender === "m" ? "herr" : "dam";

  return `REKORDTEMPO! - Timme ${context.raceHour} av 24

Löpare: ${runner.name} (${runner.country})
Projicerad distans: ${projectedDistance.toFixed(1)} km
Rekordgräns: ${recordThreshold} km
Nuvarande distans: ${runner.distanceKm.toFixed(2)} km

Skriv en spännande kommentar (3-4 meningar) som:
1. Lyfter att löparen är på rekordtempo
2. Väger in hur många timmar som återstår och vad som krävs för att hålla tempot
3. Jämför med världsrekord om du vet det (319 km herrar, 270+ km damer)
4. Var realistisk men uppmuntrande

Detta är STORT - förmedla spänningen!`;
}

function buildGenericEventPrompt(event: RaceEvent, context: CommentaryContext): string {
  return `Händelse: ${event.eventType}
Timme: ${context.raceHour} av 24

Data: ${JSON.stringify(event.eventData, null, 2)}

Skriv en kort, relevant kommentar (2-3 meningar) baserat på händelsen ovan.`;
}

/**
 * Build prompt for hourly summary
 */
export function buildHourlySummaryPrompt(summaryData: any): string {
  const {
    raceHour,
    recentEvents,
    menLeaders,
    womenLeaders,
    menTeams,
    womenTeams,
    swedenRunners,
  } = summaryData;

  let prompt = `TIMSAMMANFATTNING - Timme ${raceHour} av 24

=== HÄNDELSER SENASTE TIMMEN ===
${formatRecentEvents(recentEvents)}

=== TOP 5 HERRAR ===
${formatLeaders(menLeaders)}

=== TOP 5 DAMER ===
${formatLeaders(womenLeaders)}

=== TOP 5 LAG HERRAR ===
${formatTeams(menTeams)}

=== TOP 5 LAG DAMER ===
${formatTeams(womenTeams)}

=== SVENSKA LAGET ===
${formatSwedishRunners(swedenRunners)}

---

Skriv en engagerande sammanfattning (5-7 meningar) som:
1. Inleder med det mest intressanta/dramatiska från senaste timmen
2. Sammanfattar läget i medaljkampen (både individuellt och lag)
3. Lyfter svenska löpare specifikt - hur ligger de till?
4. Identifierar 2-3 nyckelpersoner/storylines att bevaka nästa timme
5. Anpassa ton efter vilket tidsläge vi är i loppet (se systemprompten)

Gör sammanfattningen levande och engagerande - detta är en stor uppdatering som sammanfattar timmen!`;

  return prompt;
}

// Helper formatters
function formatRecentEvents(events: any[]): string {
  if (events.length === 0) return "Inga större händelser rapporterade.";

  return events
    .slice(0, 10)
    .map((e) => {
      const bibs = e.related_bibs || e.relatedBibs || [];
      const countries = e.related_countries || e.relatedCountries || [];
      return `- ${e.event_type || e.eventType}: BIB ${bibs.join(", ")} (${countries.join(", ")})`;
    })
    .join("\n");
}

function formatLeaders(leaders: any[]): string {
  return leaders
    .map((r, i) => `${i + 1}. ${r.name} (${r.country}) - ${r.distanceKm.toFixed(2)} km`)
    .join("\n");
}

function formatTeams(teams: any[]): string {
  return teams
    .map((t, i) => `${i + 1}. ${t.country} - ${t.total.toFixed(2)} km`)
    .join("\n");
}

function formatSwedishRunners(runners: any[]): string {
  if (runners.length === 0) return "Inga svenska löpare i loppet.";

  return runners
    .map(
      (r) =>
        `${r.name} - ${r.rank}:a totalt (${r.genderRank}:a ${r.gender === "m" ? "herr" : "dam"}) - ${r.distanceKm.toFixed(2)} km`
    )
    .join("\n");
}
