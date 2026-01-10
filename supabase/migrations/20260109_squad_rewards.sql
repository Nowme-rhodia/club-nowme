-- Add reward tracking to Micro Squads
-- Created: 2026-01-09

ALTER TABLE public.micro_squads ADD COLUMN IF NOT EXISTS is_rewarded boolean DEFAULT false;
