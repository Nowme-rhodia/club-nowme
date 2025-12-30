-- Add notification_settings column to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"new_booking": true, "booking_reminder": true, "booking_cancellation": true, "marketing": false}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.partners.notification_settings IS 'Stores partner email notification preferences';
