-- Safely add address column to partners table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'partners'
        AND column_name = 'address'
    ) THEN
        ALTER TABLE partners ADD COLUMN address text;
    END IF;
END $$;
