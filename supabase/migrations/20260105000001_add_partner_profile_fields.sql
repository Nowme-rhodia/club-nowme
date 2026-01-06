-- Add profile fields to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS instagram text;

-- Add comment to clarify usage
COMMENT ON COLUMN public.partners.description IS 'Description commerciale (Pourquoi vous allez kiffer)';
