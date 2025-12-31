-- Add Stripe Connect columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_stripe_account_id ON partners(stripe_account_id);

-- Security: Partners can read their own stripe info
-- (Existing policies usually cover SELECT * for own partner record, but good to double check implicitely)
-- No RLS change needed if they can already SELECT * from their own row.
