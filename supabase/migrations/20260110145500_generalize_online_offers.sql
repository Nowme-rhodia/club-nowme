-- Ensure external_link exists on offers for generic appointments and web access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'external_link') THEN
        ALTER TABLE offers ADD COLUMN external_link text;
    END IF;
END $$;

-- Update valid booking types check to include 'simple_access' and keep 'calendly' for backward compatibility/legacy
DO $$
BEGIN
    -- We drop the constraint if it exists to recreate it with new values
    -- This handles the case where simple_access might be missing
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'offers' AND constraint_name = 'offers_booking_type_check') THEN
        ALTER TABLE offers DROP CONSTRAINT offers_booking_type_check;
        ALTER TABLE offers ADD CONSTRAINT offers_booking_type_check 
        CHECK (booking_type IN ('event', 'calendly', 'simple_access', 'purchase', 'wallet_pack', 'promo')); 
    END IF;
END $$;

COMMENT ON COLUMN offers.external_link IS 'Generic external link. Used for: 1. Appointment booking link (Calendly/Doctolib) when booking_type=calendly. 2. Restricted content access link when booking_type=simple_access.';
