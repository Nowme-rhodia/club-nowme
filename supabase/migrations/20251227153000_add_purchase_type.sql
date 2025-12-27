-- Migration: Allow 'purchase' as a booking_type in offers
-- Created at: 2025-12-27T15:30:00.000Z

-- First drop the existing check constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_booking_type_check') THEN
        ALTER TABLE offers DROP CONSTRAINT offers_booking_type_check;
    END IF;
    
    -- Re-add with 'purchase' included
    -- Note: We check what values are allowed. Previously: 'calendly', 'event', 'promo' ?? 
    -- If there was no constraint, this adds one. If there was, it updates it.
    
    ALTER TABLE offers 
    ADD CONSTRAINT offers_booking_type_check 
    CHECK (booking_type IN ('calendly', 'event', 'promo', 'purchase', 'none'));
END $$;
