-- Add meeting_location column to bookings table to store address/link
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_location TEXT;

COMMENT ON COLUMN bookings.meeting_location IS 'The address or link for the appointment (synced from Calendly)';
