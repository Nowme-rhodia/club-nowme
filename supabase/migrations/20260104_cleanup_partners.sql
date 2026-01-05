-- Clean up Orphaned Partners and their dependencies
-- 1. Identify partners to delete (those not linked to any user_profile)
WITH partners_to_delete AS (
    SELECT id FROM public.partners
    WHERE id NOT IN (
        SELECT partner_id 
        FROM public.user_profiles 
        WHERE partner_id IS NOT NULL
    )
)
-- 2. Delete dependent records

-- Delete Bookings linked to these partners
, delete_bookings AS (
    DELETE FROM public.bookings
    WHERE partner_id IN (SELECT id FROM partners_to_delete)
)

-- Delete Offers linked to these partners
, delete_offers AS (
    DELETE FROM public.offers
    WHERE partner_id IN (SELECT id FROM partners_to_delete)
)

-- Delete Partner Notifications
, delete_notifications AS (
    DELETE FROM public.partner_notifications
    WHERE partner_id IN (SELECT id FROM partners_to_delete)
)

-- 3. Finally, delete the partners
DELETE FROM public.partners
WHERE id IN (SELECT id FROM partners_to_delete);
