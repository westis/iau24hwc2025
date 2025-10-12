-- PostgreSQL Schema for IAU 24h World Championships Runner Analytics
-- For Supabase deployment

-- Runners table: Core runner data from entry list + DUV matching
CREATE TABLE IF NOT EXISTS runners (
    id SERIAL PRIMARY KEY,
    entry_id TEXT UNIQUE NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    nationality TEXT NOT NULL,  -- ISO 3166-1 alpha-3
    gender TEXT NOT NULL CHECK(gender IN ('M', 'W')),

    -- Participation status
    dns BOOLEAN DEFAULT FALSE,  -- Did Not Start - true if runner won't participate

    -- DUV matching data
    duv_id INTEGER,
    match_status TEXT NOT NULL DEFAULT 'unmatched'
        CHECK(match_status IN ('unmatched', 'auto-matched', 'manually-matched', 'no-match')),
    match_confidence REAL,  -- 0.0 to 1.0

    -- Performance data from DUV
    personal_best_all_time REAL,  -- km
    personal_best_all_time_year INTEGER,  -- Year when all-time PB was set
    personal_best_last_2_years REAL,  -- km
    personal_best_last_2_years_year INTEGER,  -- Year when last-2-years PB was set
    date_of_birth TEXT,  -- ISO date
    age INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance history: Individual race results from DUV
CREATE TABLE IF NOT EXISTS performances (
    id SERIAL PRIMARY KEY,
    runner_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL,  -- ISO date
    distance REAL NOT NULL,  -- km for 24h races
    rank INTEGER,
    event_type TEXT NOT NULL,  -- '24h', '100km', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (runner_id) REFERENCES runners(id) ON DELETE CASCADE
);

-- DUV match candidates: For manual review
CREATE TABLE IF NOT EXISTS match_candidates (
    id SERIAL PRIMARY KEY,
    runner_id INTEGER NOT NULL,
    duv_person_id INTEGER NOT NULL,
    lastname TEXT NOT NULL,
    firstname TEXT NOT NULL,
    year_of_birth INTEGER,
    nation TEXT,
    sex TEXT,
    personal_best TEXT,  -- Raw DUV PB string
    confidence REAL NOT NULL,  -- 0.0 to 1.0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (runner_id) REFERENCES runners(id) ON DELETE CASCADE
);

-- Teams: Calculated team rankings (materialized view)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    nationality TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('M', 'W')),
    metric TEXT NOT NULL CHECK(metric IN ('all-time', 'last-2-years')),
    team_total REAL NOT NULL,
    rank INTEGER NOT NULL,

    -- Top 3 runners (denormalized for performance)
    runner1_id INTEGER,
    runner2_id INTEGER,
    runner3_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(nationality, gender, metric),
    FOREIGN KEY (runner1_id) REFERENCES runners(id),
    FOREIGN KEY (runner2_id) REFERENCES runners(id),
    FOREIGN KEY (runner3_id) REFERENCES runners(id)
);

-- News table: News items and announcements
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Runner notes: Allows both standalone notes and links to news items
CREATE TABLE IF NOT EXISTS runner_notes (
    id SERIAL PRIMARY KEY,
    runner_id INTEGER NOT NULL,
    note_text TEXT,              -- Optional standalone note
    news_id INTEGER,             -- Optional link to news item
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- At least one of note_text or news_id must be present
    CHECK (note_text IS NOT NULL OR news_id IS NOT NULL),

    FOREIGN KEY (runner_id) REFERENCES runners(id) ON DELETE CASCADE,
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_runners_nationality_gender ON runners(nationality, gender);
CREATE INDEX IF NOT EXISTS idx_runners_duv_id ON runners(duv_id);
CREATE INDEX IF NOT EXISTS idx_runners_match_status ON runners(match_status);
CREATE INDEX IF NOT EXISTS idx_performances_runner_id ON performances(runner_id);
CREATE INDEX IF NOT EXISTS idx_performances_event_date ON performances(event_date);
CREATE INDEX IF NOT EXISTS idx_match_candidates_runner_id ON match_candidates(runner_id);
CREATE INDEX IF NOT EXISTS idx_teams_nationality_gender ON teams(nationality, gender);
CREATE INDEX IF NOT EXISTS idx_runner_notes_runner_id ON runner_notes(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_notes_news_id ON runner_notes(news_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at timestamp
CREATE TRIGGER update_runners_timestamp
    BEFORE UPDATE ON runners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_timestamp
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_timestamp
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runner_notes_timestamp
    BEFORE UPDATE ON runner_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
