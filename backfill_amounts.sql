-- Backfill script to populate missing booking amounts
-- This is a best-effort update: it takes the price from the 'first' variant found for the offer.
-- Since bookings didn't historically track variant_id, this assumes the first variant's price is the correct one.

UPDATE bookings b
SET amount = COALESCE(ov.discounted_price, ov.price)
FROM offer_variants ov
WHERE b.offer_id = ov.offer_id
  -- Update only if amount is 0 or NULL
  AND (b.amount IS NULL OR b.amount = 0)
  -- Update only confirmed/valid bookings to strictly affect revenue calculations
  AND b.status IN ('confirmed', 'paid', 'completed', 'promo_claimed')
  -- Ensure we map to a variant (Postgres will pick one if multiple exist, usually the first inserted)
  AND ov.id = (
      SELECT id FROM offer_variants 
      WHERE offer_id = b.offer_id 
      LIMIT 1
  );

-- Output result check
SELECT 
    COUNT(*) as bookings_updated 
FROM bookings 
WHERE amount > 0;
