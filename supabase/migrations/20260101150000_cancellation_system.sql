-- Create cancellation_policy enum idempotently
DO $$ BEGIN
    CREATE TYPE public.cancellation_policy AS ENUM ('flexible', 'moderate', 'strict', 'non_refundable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add cancellation_policy to offers
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS cancellation_policy public.cancellation_policy DEFAULT 'flexible' NOT NULL;

-- Add cancellation fields to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add comment on columns for documentation
COMMENT ON COLUMN public.offers.cancellation_policy IS 'flexible: 24h, moderate: 7 days, strict: 15 days, non_refundable: never';
