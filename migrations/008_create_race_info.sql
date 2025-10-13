-- Migration 008: Create race_info table and race_documents table
-- For storing race information (date, location, links, etc.)

-- Create race_info table
CREATE TABLE IF NOT EXISTS race_info (
  id SERIAL PRIMARY KEY,

  -- Basic Info
  race_name_en VARCHAR(255) NOT NULL,
  race_name_sv VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_sv TEXT,

  -- Date/Time (using Stockholm/Sweden timezone)
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Location
  location_name VARCHAR(255),
  location_address TEXT,
  location_latitude NUMERIC(10, 8),
  location_longitude NUMERIC(11, 8),

  -- External Links
  live_results_url TEXT,
  registration_url TEXT,
  official_website_url TEXT,

  -- Media
  course_map_url TEXT, -- Supabase Storage URL
  hero_image_url TEXT,

  -- Additional Info
  rules_en TEXT,
  rules_sv TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- SEO/Meta
  meta_description_en TEXT,
  meta_description_sv TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Active race flag (only one race should be active at a time)
  is_active BOOLEAN DEFAULT true
);

-- Only one race should be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_race ON race_info (is_active) WHERE is_active = true;

-- Create race_documents table (for downloadable PDFs, maps, schedules, etc.)
CREATE TABLE IF NOT EXISTS race_documents (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES race_info(id) ON DELETE CASCADE,

  title_en VARCHAR(255) NOT NULL,
  title_sv VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_sv TEXT,

  document_url TEXT NOT NULL, -- Supabase Storage URL
  document_type VARCHAR(50), -- 'map', 'rules', 'schedule', 'info', 'other'
  file_size_bytes INTEGER,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_race_documents_race_id ON race_documents(race_id, display_order);

-- Insert initial race data for IAU 24H World Championships 2025
INSERT INTO race_info (
  race_name_en,
  race_name_sv,
  description_en,
  description_sv,
  start_date,
  end_date,
  location_name,
  location_address,
  is_active
) VALUES (
  'IAU 24H World Championships 2025',
  'IAU 24-timmars VM 2025',
  'The IAU 24 Hour World Championships 2025 will be held in Albi, France.',
  'IAU 24-timmars världsmästerskapen 2025 kommer att hållas i Albi, Frankrike.',
  '2025-10-18 10:00:00+02:00',
  '2025-10-19 10:00:00+02:00',
  'Albi, France',
  'Albi, France',
  true
);
