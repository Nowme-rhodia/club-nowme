-- Add commission_rate to partners table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'commission_rate') THEN
        ALTER TABLE partners ADD COLUMN commission_rate NUMERIC DEFAULT 15;
    END IF;
END $$;

-- Update the specific test partner (Rhodi's partner account) to 20% commission
-- We identify the partner via the user_id or partner_id known from previous context
-- User ID: 62b99bd7-b47c-4589-ba08-586085fbca8e (from auth logs)
-- Partner ID from logs: c78f1403-22b5-43e9-ac0d-00577701731b (from comments in fix_partners_rls.sql)

UPDATE partners
SET commission_rate = 20
WHERE id = 'c78f1403-22b5-43e9-ac0d-00577701731b';

-- Verify the update
SELECT id, business_name, commission_rate FROM partners WHERE id = 'c78f1403-22b5-43e9-ac0d-00577701731b';
