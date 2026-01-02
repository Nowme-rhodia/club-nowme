-- 1. Add the missing penalty_amount column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC DEFAULT 0;

-- 2. Fix the specific booking to appear as cancelled by partner with a penalty
-- This allows you to verify the Dashboard visual immediately
UPDATE bookings
SET 
  cancelled_by_partner = true,
  penalty_amount = 5.00,
  cancellation_reason = 'Annulation Pro (Test Manual Fix)'
WHERE id = '35286dd6-7206-48df-b823-422d71f58df7';
