-- Migration: Add missing columns to micro_squads
-- Created at: 2026-01-08

ALTER TABLE public.micro_squads ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.micro_squads ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;
ALTER TABLE public.micro_squads ADD COLUMN IF NOT EXISTS external_link TEXT;
