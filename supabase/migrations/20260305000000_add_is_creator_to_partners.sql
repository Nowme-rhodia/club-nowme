ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

COMMENT ON COLUMN public.partners.is_creator IS 'True if the partner is a content creator (influencer) rather than a venue/service provider.';
COMMENT ON COLUMN public.partners.referral_code IS 'Unique code for creator referrals (e.g. KIFA3M).';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_partners_is_creator ON public.partners(is_creator);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON public.partners(referral_code);
