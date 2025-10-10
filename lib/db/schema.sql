-- SQLite Schema for IAU 24h World Championships Runner Analytics

-- Runners table: Core runner data from entry list + DUV matching
CREATE TABLE IF NOT EXISTS runners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT UNIQUE NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    nationality TEXT NOT NULL,  -- ISO 3166-1 alpha-3
    gender TEXT NOT NULL CHECK(gender IN ('M', 'W')),

    -- DUV matching data
    duv_id INTEGER,
    match_status TEXT NOT NULL DEFAULT 'unmatched'
        CHECK(match_status IN ('unmatched', 'auto-matched', 'manually-matched', 'no-match')),
    match_confidence REAL,  -- 0.0 to 1.0

    -- Performance data from DUV
    personal_best_all_time REAL,  -- km
    personal_best_last_2_years REAL,  -- km
    date_of_birth TEXT,  -- ISO date
    age INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance history: Individual race results from DUV
CREATE TABLE IF NOT EXISTS performances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_runners_nationality_gender ON runners(nationality, gender);
CREATE INDEX IF NOT EXISTS idx_runners_duv_id ON runners(duv_id);
CREATE INDEX IF NOT EXISTS idx_runners_match_status ON runners(match_status);
CREATE INDEX IF NOT EXISTS idx_performances_runner_id ON performances(runner_id);
CREATE INDEX IF NOT EXISTS idx_performances_event_date ON performances(event_date);
CREATE INDEX IF NOT EXISTS idx_match_candidates_runner_id ON match_candidates(runner_id);
CREATE INDEX IF NOT EXISTS idx_teams_nationality_gender ON teams(nationality, gender);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_runners_timestamp
AFTER UPDATE ON runners
BEGIN
    UPDATE runners SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_teams_timestamp
AFTER UPDATE ON teams
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
