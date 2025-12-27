-- Add calendly_token to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS calendly_token TEXT;

-- Add external_id and source to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'calendly';

-- Add unique constraint to external_id to prevent duplicates
-- We use a conditional block to avoid error if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_external_id_key'
    ) THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_external_id_key UNIQUE (external_id);
    END IF;
END $$;
