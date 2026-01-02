-- Add updated_at column to bookings table if it doesn't exist
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN bookings.updated_at IS 'Timestamp of the last update to the booking';
