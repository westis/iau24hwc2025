-- Add focal point fields for runner photos
ALTER TABLE runners ADD COLUMN IF NOT EXISTS photo_focal_x NUMERIC(5,2) DEFAULT 50;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS photo_focal_y NUMERIC(5,2) DEFAULT 50;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS photo_zoom NUMERIC(3,2) DEFAULT 1.5;

-- Add focal point fields for team photos
ALTER TABLE teams ADD COLUMN IF NOT EXISTS photo_focal_x NUMERIC(5,2) DEFAULT 50;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS photo_focal_y NUMERIC(5,2) DEFAULT 50;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS photo_zoom NUMERIC(3,2) DEFAULT 1.5;

-- Add comments
COMMENT ON COLUMN runners.photo_focal_x IS 'Focal point X coordinate as percentage (0-100)';
COMMENT ON COLUMN runners.photo_focal_y IS 'Focal point Y coordinate as percentage (0-100)';
COMMENT ON COLUMN runners.photo_zoom IS 'Photo zoom level (1.0-3.0)';
COMMENT ON COLUMN teams.photo_focal_x IS 'Focal point X coordinate as percentage (0-100)';
COMMENT ON COLUMN teams.photo_focal_y IS 'Focal point Y coordinate as percentage (0-100)';
COMMENT ON COLUMN teams.photo_zoom IS 'Photo zoom level (1.0-3.0)';
