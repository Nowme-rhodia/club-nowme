-- Migration: Add feedback tracking and duration
-- Created at: 2026-01-01T14:10:00.000Z

-- 1. Add feedback_email_sent_at to bookings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'feedback_email_sent_at') THEN
        ALTER TABLE public.bookings ADD COLUMN feedback_email_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Add duration to offers (in minutes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'duration') THEN
        ALTER TABLE public.offers ADD COLUMN duration INTEGER DEFAULT 60; -- Default 1 hour
    END IF;
END $$;

-- 3. Update offers RLS if needed (usually public read is fine)
-- No special policy needed for duration as it's just public offer info
