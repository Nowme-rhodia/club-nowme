-- Migration: Fix duplicate hubs
-- Created at: 2026-01-08

-- 1. Remove duplicates, keeping the oldest one
DELETE FROM public.community_hubs
WHERE id NOT IN (
    SELECT DISTINCT ON (name) id
    FROM public.community_hubs
    ORDER BY name, created_at ASC
);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE public.community_hubs ADD CONSTRAINT community_hubs_name_key UNIQUE (name);
