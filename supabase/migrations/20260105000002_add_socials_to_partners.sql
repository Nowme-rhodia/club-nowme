-- Add social media columns to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS instagram text;
