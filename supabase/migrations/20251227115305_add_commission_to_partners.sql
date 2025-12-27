-- Migration: Add commission_rate to partners
-- Created at: 2025-12-27T11:53:05.123Z

-- 1. Ensure column exists and has correct type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'commission_rate') THEN
        ALTER TABLE partners ADD COLUMN commission_rate NUMERIC(10,2) DEFAULT 15;
    ELSE
        -- If it exists, ensure it has enough precision (Fix for 22003 overflow)
        ALTER TABLE partners ALTER COLUMN commission_rate TYPE NUMERIC(10,2);
        ALTER TABLE partners ALTER COLUMN commission_rate SET DEFAULT 15;
    END IF;
END $$;

-- 2. Update the specific test partner to 20% commission
UPDATE partners
SET commission_rate = 20
WHERE id = 'c78f1403-22b5-43e9-ac0d-00577701731b';
