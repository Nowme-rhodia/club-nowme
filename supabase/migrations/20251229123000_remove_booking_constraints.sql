-- Migration: Remove restrictive constraints from bookings table
-- Created at: 2025-12-29T12:30:00.000Z

-- Attempt to drop potential unique constraints that prevent multiple bookings
DO $$
BEGIN
    -- Drop constraint on (user_id, offer_id) if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_offer_id_key') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_offer_id_key;
    END IF;

    -- Drop constraint on (user_id, offer_id, booking_date) just in case
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_offer_id_booking_date_key') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_offer_id_booking_date_key;
    END IF;

    -- Also check for standard unique index names that might satisfy the constraint
    -- (Postgres creates implicit indexes for unique constraints)
    -- This part is just ensuring we clean up any preventing index
    
END $$;
