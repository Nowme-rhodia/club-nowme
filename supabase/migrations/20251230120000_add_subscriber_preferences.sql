-- Add subscription preference columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS sub_auto_recap BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sub_newsletter BOOLEAN DEFAULT true;

-- Comment on columns for clarity
COMMENT ON COLUMN public.user_profiles.sub_auto_recap IS 'User preference for receiving the weekly automated recap (Le Récap des Kiffs)';
COMMENT ON COLUMN public.user_profiles.sub_newsletter IS 'User preference for receiving the editorial newsletter (La Newsletter du Kiff)';
