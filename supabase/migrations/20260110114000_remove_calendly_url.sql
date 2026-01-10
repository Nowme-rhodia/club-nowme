
-- Migration: Remove calendly_url column from offers table
-- Created at: 2026-01-10T11:40:00.000Z

ALTER TABLE offers DROP COLUMN IF EXISTS calendly_url;
