-- Migration: Fix timestamp columns to timestamptz
-- This ensures that dates are stored with timezone awareness (UTC) and displayed correctly in any timezone.

-- 1. Alter event_start_date
ALTER TABLE public.offers 
  ALTER COLUMN event_start_date TYPE timestamptz 
  USING event_start_date AT TIME ZONE 'UTC';

-- 2. Alter event_end_date
ALTER TABLE public.offers 
  ALTER COLUMN event_end_date TYPE timestamptz 
  USING event_end_date AT TIME ZONE 'UTC';

-- 3. Alter validity_start_date
ALTER TABLE public.offers 
  ALTER COLUMN validity_start_date TYPE timestamptz 
  USING validity_start_date AT TIME ZONE 'UTC';

-- 4. Alter validity_end_date
ALTER TABLE public.offers 
  ALTER COLUMN validity_end_date TYPE timestamptz 
  USING validity_end_date AT TIME ZONE 'UTC';
