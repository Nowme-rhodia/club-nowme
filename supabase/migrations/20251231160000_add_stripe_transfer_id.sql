
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
