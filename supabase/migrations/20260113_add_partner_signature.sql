-- Add contract_signed_at to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN partners.contract_signed_at IS 'Timestamp when the partner electronically signed the mandate contract.';
