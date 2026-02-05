-- Add cancellation_deadline_hours to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS cancellation_deadline_hours INTEGER;
