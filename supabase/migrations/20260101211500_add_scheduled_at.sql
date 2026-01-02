-- Add scheduled_at column to bookings table to track actual appointment time
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN bookings.scheduled_at IS 'The actual date/time of the appointment (e.g. from Calendly)';
