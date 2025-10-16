-- Enable RLS on all public tables
-- This resolves the "RLS Disabled in Public" linter warnings

-- Enable RLS on all tables
ALTER TABLE performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE runners ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for read access (since these are public data)
-- Anyone can read these tables (authenticated and anonymous users)

-- Performances: Anyone can read
CREATE POLICY "Allow public read access to performances"
ON performances FOR SELECT
USING (TRUE);

-- Match candidates: Anyone can read
CREATE POLICY "Allow public read access to match_candidates"
ON match_candidates FOR SELECT
USING (TRUE);

-- Teams: Anyone can read
CREATE POLICY "Allow public read access to teams"
ON teams FOR SELECT
USING (TRUE);

-- News: Anyone can read published news
CREATE POLICY "Allow public read access to news"
ON news FOR SELECT
USING (TRUE);

-- Runner notes: Anyone can read
CREATE POLICY "Allow public read access to runner_notes"
ON runner_notes FOR SELECT
USING (TRUE);

-- Race info: Anyone can read
CREATE POLICY "Allow public read access to race_info"
ON race_info FOR SELECT
USING (TRUE);

-- Race documents: Anyone can read
CREATE POLICY "Allow public read access to race_documents"
ON race_documents FOR SELECT
USING (TRUE);

-- Runners: Anyone can read
CREATE POLICY "Allow public read access to runners"
ON runners FOR SELECT
USING (TRUE);

-- Note: Write/Update/Delete operations are still restricted by default
-- These tables are managed server-side via API routes with SUPABASE_SERVICE_ROLE_KEY
-- No INSERT/UPDATE/DELETE policies needed as client-side writes are not allowed





