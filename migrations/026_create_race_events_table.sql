-- Migration 026: Create race_events table for AI commentary event detection
-- Tracks detected events that trigger AI commentary generation

CREATE TABLE IF NOT EXISTS race_events (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,

  -- Event classification
  event_type VARCHAR(50) NOT NULL,
  -- Types: 'break_started', 'break_ended', 'lead_change', 'significant_move',
  --        'pace_surge', 'pace_drop', 'milestone', 'record_pace', 'team_battle'

  priority VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),

  -- Related entities for filtering
  related_bibs INTEGER[],
  related_countries VARCHAR(3)[],

  -- Event-specific data (flexible JSONB for different event types)
  event_data JSONB NOT NULL,
  -- Example structures:
  -- break_started: {"runner": {...}, "timeSince": 1200000, "lastLap": {...}}
  -- lead_change: {"newLeader": {...}, "oldLeader": {...}, "gap": 2.5, "gender": "m"}
  -- significant_move: {"runner": {...}, "oldRank": 15, "newRank": 8, "timeframe": 60}

  -- AI commentary status
  commentary_generated BOOLEAN DEFAULT FALSE,
  commentary_id INTEGER REFERENCES race_updates(id),
  generation_attempted_at TIMESTAMP,
  generation_error TEXT,

  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- When the event occurred
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_race_events_pending
  ON race_events(race_id, commentary_generated, priority DESC, timestamp DESC)
  WHERE commentary_generated = FALSE;

CREATE INDEX IF NOT EXISTS idx_race_events_type
  ON race_events(race_id, event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_race_events_timestamp
  ON race_events(race_id, timestamp DESC);

-- GIN indexes for array searches
CREATE INDEX IF NOT EXISTS idx_race_events_bibs
  ON race_events USING GIN(related_bibs);

CREATE INDEX IF NOT EXISTS idx_race_events_countries
  ON race_events USING GIN(related_countries);

-- Prevent exact duplicate events (no function in index - just check exact matches)
-- Note: Duplicate prevention is handled in application logic instead

-- Row Level Security
ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for race_events"
  ON race_events FOR SELECT
  USING (true);

-- Admin write access
CREATE POLICY "Admin write access for race_events"
  ON race_events FOR ALL
  USING (auth.role() = 'authenticated');

-- Add helpful comments
COMMENT ON TABLE race_events IS 'Detected race events that trigger AI commentary generation';
COMMENT ON COLUMN race_events.event_type IS 'Type of event: break_started, lead_change, significant_move, pace_surge, pace_drop, milestone, record_pace, team_battle';
COMMENT ON COLUMN race_events.event_data IS 'Flexible JSONB containing event-specific details for AI context';
COMMENT ON COLUMN race_events.commentary_generated IS 'Whether AI commentary has been successfully generated for this event';
