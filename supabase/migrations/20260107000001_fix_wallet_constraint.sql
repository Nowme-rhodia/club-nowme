-- Fix Constraint for Wallet Pack
-- Created: 2026-01-07

DO $$ 
BEGIN 
    -- 1. Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_booking_type_check') THEN
        ALTER TABLE public.offers DROP CONSTRAINT offers_booking_type_check;
    END IF;

    -- 2. Re-add constraint with 'wallet_pack' included
    ALTER TABLE public.offers 
    ADD CONSTRAINT offers_booking_type_check 
    CHECK (booking_type IN ('calendly', 'event', 'promo', 'purchase', 'wallet_pack', 'none'));

END $$;
