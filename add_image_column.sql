-- Add image_url column to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS image_url text;

-- Optional: Add comment
COMMENT ON COLUMN public.offers.image_url IS 'Public URL of the offer cover image';
