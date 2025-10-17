-- Add world record configuration to race_config
ALTER TABLE race_config
ADD COLUMN IF NOT EXISTS world_records JSONB DEFAULT '[]'::jsonb;

-- Default world records
UPDATE race_config
SET world_records = '[
  {
    "id": "wr_men",
    "name": "World Record (Men)",
    "distance": 309.399,
    "holder": "Aleksandr Sorokin",
    "year": 2022,
    "enabled": true
  },
  {
    "id": "wr_women",
    "name": "World Record (Women)",
    "distance": 270.116,
    "holder": "Camille Herron",
    "year": 2023,
    "enabled": true
  }
]'::jsonb
WHERE world_records IS NULL OR world_records = '[]'::jsonb;





