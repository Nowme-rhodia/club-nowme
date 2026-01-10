-- Add access_password column to offers for private content/links
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'access_password') THEN
        ALTER TABLE offers ADD COLUMN access_password text;
    END IF;
END $$;

COMMENT ON COLUMN offers.access_password IS 'Optional password for accessing restricted content (simple_access/Web Access)';
