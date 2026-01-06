-- 1) Drop bad FKs (only those that are wrong)
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_variant_id_fkey,
  DROP CONSTRAINT IF EXISTS bookings_offer_id_fkey,
  DROP CONSTRAINT IF EXISTS bookings_partner_id_fkey;

-- NOTE: We DO NOT drop bookings_user_id_fkey_profiles immediately to avoid downtime, 
-- but we will ensure it exists correctly below.

-- 2) Create correct FKs
ALTER TABLE public.bookings
  -- Link to Auth Users (Standard)
  DROP CONSTRAINT IF EXISTS bookings_user_id_fkey,
  ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.bookings
  -- Link to Public Offers
  ADD CONSTRAINT bookings_offer_id_fkey
    FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.bookings
  -- Link to Public Partners
  ADD CONSTRAINT bookings_partner_id_fkey
    FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.bookings
  -- Link to Public Offer Variants
  ADD CONSTRAINT bookings_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES public.offer_variants(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 3) CRITICAL: Link to User Profiles (Required for Dashboard)
-- We ensure this constraint exists because the Dashboard queries join directly to user_profiles.
-- If it already exists, this might fail, so we wrap in DO block or just use IF NOT EXISTS if PG version supports, 
-- but safe way is to drop and add if we want to enforce properties, or just leave it.
-- We will RE-ADD it to ensure it matches specific requirements (ON DELETE SET NULL etc).
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_user_id_fkey_profiles;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_id_fkey_profiles 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;


-- 4) Indexes to support joins/filters
CREATE INDEX IF NOT EXISTS idx_bookings_offer_id ON public.bookings(offer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON public.bookings(partner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_variant_id ON public.bookings(variant_id);

NOTIFY pgrst, 'reload schema';
