-- Add service_zones column to offers table
-- Structure: JSONB array of objects: { "code": "75", "fee": numeric }
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS service_zones JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN offers.service_zones IS 'Array of served departments with fees: [{code: "75", fee: 10}, ...]';
