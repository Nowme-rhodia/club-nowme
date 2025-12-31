-- Add cancellation_conditions column
ALTER TABLE offers ADD COLUMN IF NOT EXISTS cancellation_conditions TEXT;
