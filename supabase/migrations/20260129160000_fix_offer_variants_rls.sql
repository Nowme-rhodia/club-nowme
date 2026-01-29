-- Enable RLS for offer_variants
ALTER TABLE public.offer_variants ENABLE ROW LEVEL SECURITY;

-- Policy for Partners (ALL actions: select, insert, update, delete)
DROP POLICY IF EXISTS "Partners manage own offer variants" ON public.offer_variants;
CREATE POLICY "Partners manage own offer variants"
ON public.offer_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.offers
    WHERE offers.id = offer_variants.offer_id
    AND offers.partner_id IN (
      SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Policy for Public (Select only) - Already exists in 20251231100000_public_offers_policy.sql but checking again
-- "Public offer variants are viewable by everyone" using (true).
-- We can leave the public one alone, or reinforce it. The existing one allows "true", so public can see all variants.
-- That might be too permissive if we want to hide variants of non-approved offers? 
-- But usually offers are filtered by status='approved', so finding variants for non-approved offers is hard unless you guess UUIDs.
-- Let's stick to fixing Partner Access.

-- Policy for Admins
DROP POLICY IF EXISTS "Admins manage all variants" ON public.offer_variants;
CREATE POLICY "Admins manage all variants"
ON public.offer_variants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);
