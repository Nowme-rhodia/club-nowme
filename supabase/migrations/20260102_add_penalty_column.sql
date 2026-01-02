-- Add penalty_amount to bookings to track specific cancellation fees
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC DEFAULT 0;
