-- Backfill partner_id in bookings table based on offer_id
-- Created at: 2025-12-27T13:05:00.000Z

DO $$
BEGIN
    -- Update bookings that have null partner_id
    UPDATE bookings b
    SET partner_id = o.partner_id
    FROM offers o
    WHERE b.offer_id = o.id
    AND b.partner_id IS NULL;
END $$;
