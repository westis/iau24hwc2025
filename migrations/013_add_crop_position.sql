-- Add crop position columns to store react-easy-crop's crop state
ALTER TABLE runners ADD COLUMN photo_crop_x REAL;
ALTER TABLE runners ADD COLUMN photo_crop_y REAL;

