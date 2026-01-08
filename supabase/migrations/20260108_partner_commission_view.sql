-- Migration: Create Partner Commission History View
-- Date: 2026-01-08
-- Description: Provides a simplified view for partners to see their commission history.

CREATE OR REPLACE VIEW partner_commission_history AS
SELECT 
    b.id as booking_id,
    b.partner_id,
    b.booking_date,
    b.amount as total_amount,
    b.commission_amount,
    b.commission_note,
    b.currency,
    b.status,
    u.email as customer_email,
    o.title as offer_title
FROM bookings b
LEFT JOIN user_profiles u ON b.user_id = u.user_id
LEFT JOIN offers o ON b.offer_id = o.id
WHERE b.status = 'confirmed' 
  AND b.commission_amount > 0;

-- Grant access to authenticated users (Partners will be filtered by RLS on bookings table if enabled, 
-- or we should add RLS to this view if bookings is not RLS-protected for partners)
-- Assuming 'bookings' has RLS that allows partners to see their own bookings.
GRANT SELECT ON partner_commission_history TO authenticated;
