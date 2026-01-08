-- Migration: Add Category Support to Partners Table
-- Date: 2026-01-08

-- 1. Add main_category_id and subcategory_ids to partners
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS main_category_id UUID REFERENCES offer_categories(id),
ADD COLUMN IF NOT EXISTS subcategory_ids UUID[] DEFAULT '{}';

-- 2. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_partners_main_category_id ON partners(main_category_id);

-- 3. Comment
COMMENT ON COLUMN partners.main_category_id IS 'Primary category defining the partner identity (e.g. Wellness)';
COMMENT ON COLUMN partners.subcategory_ids IS 'Array of subcategory IDs for more specific tagging';
