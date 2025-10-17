# AI Live Race Commentary System - Implementation Guide

## Overview

A cost-optimized AI commentary system for the IAU 24-Hour World Championship that generates intelligent, Swedish-language insights during the race. Designed to provide **under $1 total cost** for the entire 24-hour event.

## What We Built

### 1. **Cost-Optimized Architecture**

**Three-layer system:**
```
Event Detection (every 5 min)
         ↓
AI Commentary Generator (GPT-4o-mini)
         ↓
Commentary Feed UI
```

**Estimated Costs:**
- Event commentaries: ~30 events × $0.02 = **$0.60**
- Hourly summaries: 24 summaries × $0.01 = **$0.24**
- **Total: ~$0.85 for 24 hours**

### 2. **Selective Event Detection**

**Events that trigger AI commentary:**
- **Lead changes** (always HIGH priority)
- **Breaks >30min** for top-10 runners or priority countries
- **Significant moves**: ≥8 positions OR ≥3 positions in/entering top-5
- **Dramatic pace changes**: >25% AND affecting position
- **Record pace**: Projected >300km (men) or >270km (women)

**Priority countries**: Sweden, Norway, Denmark, Finland

This selective approach reduces events from ~80 to ~30 per race, keeping costs minimal while capturing all dramatic moments.

### 3. **Swedish Commentary Style**

Prompts designed to match ultramarathon.se article style:
- Analytical yet accessible
- Focus on "why" not just "what"
- Strategic speculation
- Team implications
- Human stories and context
- Adapts tone based on race hour (0-6: cautious, 6-12: tactical, 12-18: mental game, 18-24: drama)

## Files Created

### Database
- `migrations/026_create_race_events_table.sql` - Event storage

### Types
- `types/live-race.ts` - Added RaceEvent types and commentary interfaces

### Core Logic
- `lib/ai/event-detector.ts` - Smart event detection algorithm
- `lib/ai/context-assembler.ts` - Gathers context for AI (runner notes, PBs, teams)
- `lib/ai/prompts.ts` - Swedish commentary prompts
- `lib/ai/commentary-generator.ts` - OpenAI integration (GPT-4o-mini)

### API Endpoints
- `app/api/cron/detect-race-events/route.ts` - Cron: every 5 minutes
- `app/api/cron/generate-commentary/route.ts` - Cron: every 2 minutes
- `app/api/cron/generate-hourly-summary/route.ts` - Cron: hourly
- `app/api/race/updates/route.ts` - Fetch commentary for UI

### UI Components
- `components/live/CommentaryFeed.tsx` - Commentary feed panel with filtering

### Configuration
- `vercel.json` - Updated with 3 new cron jobs

## What Remains To Do

### 1. **Integrate Commentary Feed into Live Page** (15 minutes)

**File to modify:** `app/live/page.tsx`

Add the commentary panel alongside the leaderboard:

```typescript
import { CommentaryFeed } from "@/components/live/CommentaryFeed";

// Inside LivePageContent component, update the layout:
<div className="container mx-auto py-4 px-4">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* Leaderboard - 2/3 width on desktop */}
    <div className="lg:col-span-2">
      {/* Existing leaderboard content */}
      <LeaderboardTable entries={visibleEntries} ... />
    </div>

    {/* Commentary Feed - 1/3 width on desktop */}
    <div className="lg:col-span-1">
      <div className="sticky top-4">
        <CommentaryFeed />
      </div>
    </div>
  </div>
</div>
```

### 2. **Run Database Migration** (2 minutes)

```bash
# Connect to your Supabase database and run:
psql $DATABASE_URL -f migrations/026_create_race_events_table.sql
```

### 3. **Add OpenAI API Key** (1 minute)

Add to `.env.local`:
```
OPENAI_API_KEY=sk-...
```

Get key from: https://platform.openai.com/api-keys

### 4. **Install OpenAI Package** (1 minute)

```bash
npm install openai
```

### 5. **Deploy to Vercel** (5 minutes)

```bash
git add .
git commit -m "Add AI live commentary system"
git push
```

Vercel will automatically:
- Deploy the new code
- Set up the 3 cron jobs
- Start generating commentary during live races

### 6. **Test with Simulation** (20 minutes)

Before race day, test the system:

```bash
# Start simulation
npm run simulate-live

# In separate terminal, manually trigger cron jobs to test:
curl http://localhost:3000/api/cron/detect-race-events \
  -H "Authorization: Bearer $CRON_SECRET"

curl http://localhost:3000/api/cron/generate-commentary \
  -H "Authorization: Bearer $CRON_SECRET"
```

Visit http://localhost:3000/live and verify:
- Commentary feed appears
- Updates show up within 2-3 minutes
- Swedish text quality is good
- Filtering works

### 7. **Populate Runner Notes** (Optional, 30 minutes)

Add storylines to `runner_notes` table for richer commentary:

```sql
INSERT INTO runner_notes (runner_id, note_text) VALUES
(
  (SELECT id FROM runners WHERE bib = 1),
  'Världsrekordhållare. Oklart formläge efter begränsad tävling. Favorit men osäker.'
);
```

The AI will use these notes to add context to commentary.

## How It Works - Race Day Flow

### Every 5 Minutes (Event Detection)
1. Cron triggers `/api/cron/detect-race-events`
2. Compares current leaderboard with previous state
3. Detects interesting events (breaks, lead changes, moves)
4. Stores events in `race_events` table

### Every 2 Minutes (Commentary Generation)
1. Cron triggers `/api/cron/generate-commentary`
2. Fetches pending events from database
3. For each event:
   - Assembles context (runner notes, PBs, team standings)
   - Builds Swedish prompt
   - Calls OpenAI GPT-4o-mini (~$0.02/event)
   - Stores commentary in `race_updates` table

### Every Hour (Summary)
1. Cron triggers `/api/cron/generate-hourly-summary`
2. Gathers last hour's events + current standings
3. Generates comprehensive summary (~$0.01)
4. Stores as high-priority update

### Continuous (UI)
1. Commentary feed polls `/api/race/updates` every 15 seconds
2. Displays updates in real-time
3. Users can filter by priority or type

## Monitoring & Debugging

### Check if System is Running

```bash
# View recent commentary
curl https://your-app.vercel.app/api/race/updates | jq

# Check detected events (need admin access to Supabase)
SELECT * FROM race_events ORDER BY created_at DESC LIMIT 10;

# Check generated commentary
SELECT * FROM race_updates ORDER BY created_at DESC LIMIT 10;
```

### Vercel Cron Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by `/api/cron/`
3. Look for errors or success messages

### Cost Monitoring

Check OpenAI usage:
1. https://platform.openai.com/usage
2. During race, should see steady but small usage
3. If costs spike, check for:
   - Duplicate events being generated
   - Cron jobs running too frequently
   - Context being too large

## Tuning for Better Results

### Adjust Event Sensitivity

Edit `lib/ai/event-detector.ts` - `THRESHOLDS` object:

```typescript
const THRESHOLDS = {
  BREAK_MIN_DURATION_MS: 30 * 60 * 1000, // Increase to 45min for fewer break alerts
  SIGNIFICANT_MOVE_POSITIONS: 8, // Increase to 10 for fewer position alerts
  PACE_CHANGE_PERCENT: 25, // Increase to 30 for fewer pace alerts
  // ...
};
```

### Improve Swedish Quality

Edit `lib/ai/prompts.ts` - `SYSTEM_PROMPT`:

Add specific style examples or adjust tone guidance.

### Add More Countries

Edit `lib/ai/event-detector.ts`:

```typescript
PRIORITY_COUNTRIES: ["SWE", "NOR", "DEN", "FIN", "USA", "GBR"], // Add countries
```

## Expected Output Examples

### Break Event:
> "Elov Olsson tar en paus efter 12 timmar och 170 km - smart tajming eller riskabelt? Han ligger 8:a totalt men är Sveriges förstanamn. Med tanke på hans jämna tempo hittills och att vi närmar oss nattskiftet kan detta vara en väl planerad paus."

### Lead Change:
> "LEDNINGSBYTE I HERRKLASSEN! Aleksandr Sorokin tar över ledningen från Zach Bitter med 2,3 km försprång. Sorokin har ökat tempot markant de senaste varvarna - är detta början på en rekordattack eller för aggressivt så här tidigt?"

### Hourly Summary:
> "Efter 12 timmar: Stora förändringar i toppen! Sorokin leder herrarnas på 158 km, medan Camille Herron dominerar damerna med 152 km. Sverige ligger fyra i lagkampen herrar - Elov Olsson (8:a) och Johan Steene (12:a) håller tätt. Bevaka: Brittiska laget kryper närmare, bara 3 km bakom."

## Troubleshooting

### No Commentary Appearing

1. Check cron jobs are running (Vercel Dashboard → Cron)
2. Verify OpenAI API key is set
3. Check for errors in Vercel logs
4. Manually trigger cron: `curl .../api/cron/detect-race-events`

### Commentary Quality Issues

1. Check prompts in `lib/ai/prompts.ts`
2. Verify context assembly in `lib/ai/context-assembler.ts`
3. Add more runner notes for better context
4. Consider using GPT-4o instead of 4o-mini (edit `lib/ai/commentary-generator.ts`)

### Costs Too High

1. Check how many events are being detected per hour
2. Increase thresholds in `lib/ai/event-detector.ts`
3. Reduce cron frequency (edit `vercel.json`)
4. Check for duplicate events in database

## Future Enhancements (Post-Race)

1. **Real-time notifications**: Push high-priority commentary to subscribers
2. **Multi-language**: Add English commentary alongside Swedish
3. **Voice synthesis**: Convert commentary to audio
4. **Personalized feeds**: Filter by favorite runners/countries
5. **Post-race highlights**: Generate race recap with best moments
6. **Historical comparisons**: Compare current performances to past races

## Support

If you encounter issues:
1. Check Vercel logs first
2. Review database for stuck events: `SELECT * FROM race_events WHERE commentary_generated = false`
3. Test individual components manually
4. OpenAI status: https://status.openai.com/

## Summary

You now have a complete, cost-optimized AI commentary system that:
- ✅ Detects interesting race events automatically
- ✅ Generates Swedish commentary in ultramarathon.se style
- ✅ Costs under $1 for entire 24-hour race
- ✅ Provides real-time insights beyond basic leaderboard
- ✅ Focuses on Sweden + Nordic countries
- ✅ Adapts commentary style to race phase

**Next Steps:**
1. Integrate CommentaryFeed into live page (15 min)
2. Run migration + add OpenAI key (5 min)
3. Deploy and test with simulation (30 min)
4. Populate runner notes (optional, 30 min)
5. Monitor on race day

Good luck with the race! 🏃‍♂️✨
