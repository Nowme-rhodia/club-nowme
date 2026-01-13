-- Add commission model and repeat rate to partners
-- existing commission_rate will be used as the base/first rate

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS commission_model text DEFAULT 'fixed' CHECK (commission_model IN ('fixed', 'acquisition')),
ADD COLUMN IF NOT EXISTS commission_rate_repeat numeric DEFAULT NULL;

COMMENT ON COLUMN partners.commission_rate IS 'Base commission rate. Used for Fixed model or First Order in Acquisition model.';
COMMENT ON COLUMN partners.commission_model IS 'Commission strategy: fixed (flat rate) or acquisition (high first, low repeat).';
COMMENT ON COLUMN partners.commission_rate_repeat IS 'Commission rate for repeat purchases in Acquisition model.';
