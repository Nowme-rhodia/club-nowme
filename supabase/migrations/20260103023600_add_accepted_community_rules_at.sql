-- Migration: add_accepted_community_rules_at
-- Created at: 2026-01-03T02:36:00.000Z

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS accepted_community_rules_at TIMESTAMP WITH TIME ZONE;
