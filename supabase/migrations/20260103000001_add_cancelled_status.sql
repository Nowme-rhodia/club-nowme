-- Migration: Add cancelled status to micro_squads
-- Created at: 2026-01-03T10:00:00.000Z

ALTER TABLE public.micro_squads DROP CONSTRAINT IF EXISTS micro_squads_status_check;
ALTER TABLE public.micro_squads ADD CONSTRAINT micro_squads_status_check CHECK (status IN ('open', 'full', 'finished', 'cancelled'));
