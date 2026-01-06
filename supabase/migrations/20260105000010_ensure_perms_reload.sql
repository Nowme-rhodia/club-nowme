-- Ensure permissions
GRANT SELECT ON public.bookings TO authenticated;
GRANT SELECT ON public.offer_variants TO authenticated;
GRANT SELECT ON public.offers TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;

-- Force DDL update to trigger schema cache reload more reliably than just NOTIFY
COMMENT ON CONSTRAINT bookings_variant_id_fkey ON bookings IS 'Link to offer variant';
COMMENT ON TABLE bookings IS 'Bookings table - Reloaded';

-- Explicit notify
NOTIFY pgrst, 'reload schema';
