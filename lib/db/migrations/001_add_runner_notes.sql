-- Migration: Add runner notes functionality
-- Allows both standalone notes and links to news items

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

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_runner_notes_runner_id ON runner_notes(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_notes_news_id ON runner_notes(news_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_runner_notes_timestamp
    BEFORE UPDATE ON runner_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
