-- Migration: Add 'simple_access' to booking_type check constraint
-- Created explicitly to support "Sans Rendez-vous" offers

DO $$
BEGIN
    -- Drop the old constraint if it exists (to avoid errors if updating)
    -- We'll just replace it with the comprehensive list we know of
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_booking_type_check') THEN
        ALTER TABLE offers DROP CONSTRAINT offers_booking_type_check;
    END IF;

    -- Add the new constraint with all valid types
    -- 'simple_access' is the new one
    ALTER TABLE offers 
    ADD CONSTRAINT offers_booking_type_check 
    CHECK (booking_type IN (
        'calendly', 
        'event', 
        'promo', 
        'purchase', 
        'wallet_pack', 
        'simple_access',
        'none'
    ));

END $$;
