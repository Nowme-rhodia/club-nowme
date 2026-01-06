-- Add variant_id to bookings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'variant_id') THEN
        ALTER TABLE bookings ADD COLUMN variant_id UUID REFERENCES offer_variants(id);
    END IF;
END $$;

-- Ensure the constraint has the specific name we are relying on: bookings_variant_id_fkey
-- The above ADD COLUMN ... REFERENCES ... automatically names it, usually bookings_variant_id_fkey.
-- But to be safe and explicit:

DO $$
BEGIN
    -- Check if constraint exists with expected name
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_variant_id_fkey') THEN
        -- If column exists but constraint doesn't (or has diff name), try to rename or add
         ALTER TABLE bookings 
         ADD CONSTRAINT bookings_variant_id_fkey 
         FOREIGN KEY (variant_id) 
         REFERENCES offer_variants(id);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
