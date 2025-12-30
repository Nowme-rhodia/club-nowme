-- CLEANUP SCRIPT: Force Delete Orphaned Partners and Linked Data
-- This script recursively deletes data linked to orphaned partners.

-- 1. Create a temporary table to store the IDs of partners to delete
CREATE TEMP TABLE partners_to_delete AS
SELECT id FROM partners
WHERE id NOT IN (SELECT DISTINCT partner_id FROM user_profiles WHERE partner_id IS NOT NULL);

-- 2. Delete linked data (Order matters!)

-- 2.1 Delete Bookings linked to these partners (if any)
DELETE FROM bookings
WHERE partner_id IN (SELECT id FROM partners_to_delete);

-- 2.2 Delete Offer Media linked to offers of these partners
DELETE FROM offer_media
WHERE offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (SELECT id FROM partners_to_delete)
);

-- 2.3 Delete Offer Variants linked to offers of these partners
DELETE FROM offer_variants
WHERE offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (SELECT id FROM partners_to_delete)
);

-- 2.4 Delete Offers linked to these partners
DELETE FROM offers
WHERE partner_id IN (SELECT id FROM partners_to_delete);

-- 3. Finally, Delete the Partners
DELETE FROM partners
WHERE id IN (SELECT id FROM partners_to_delete);

-- 4. Verification
SELECT count(*) as "Remaining Partners Count" FROM partners;
SELECT count(*) as "Deleted Partners Count" FROM partners_to_delete;

-- Cleanup temp table
DROP TABLE partners_to_delete;
