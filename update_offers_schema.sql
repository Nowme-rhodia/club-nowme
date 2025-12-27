-- Add new columns for Multi-Type Booking System
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'calendly' CHECK (booking_type IN ('calendly', 'event', 'promo')),
ADD COLUMN IF NOT EXISTS external_link text,
ADD COLUMN IF NOT EXISTS promo_code text;

-- Comment on columns
COMMENT ON COLUMN public.offers.booking_type IS 'Type of booking: calendly, event (fixed date), or promo (external link)';
COMMENT ON COLUMN public.offers.external_link IS 'URL for external booking or promo offer';
COMMENT ON COLUMN public.offers.promo_code IS 'Promo code to display to the user';
