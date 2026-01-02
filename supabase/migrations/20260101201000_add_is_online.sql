-- Add is_online column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- Update existing offers based on city/address if possible (optional, but good for cleanup)
-- For now, we trust the default false, as most existing offers are physical events.
