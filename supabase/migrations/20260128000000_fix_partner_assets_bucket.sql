-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-assets', 'partner-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Phase 1: Ensure partners have user_id set (CRITICAL for RLS)
-- We sync from user_profiles which is the source of truth for the link
UPDATE public.partners p
SET user_id = up.user_id
FROM public.user_profiles up
WHERE p.id = up.partner_id 
AND p.user_id IS NULL;

-- Enable RLS on objects is default, skipping explicit enable to avoid permission errors
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Phase 2: Policies
-- Drop existing policies to be safe/clean
DROP POLICY IF EXISTS "Partner assets are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Partners can upload their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Partners can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Partners can delete their own assets" ON storage.objects;

-- 1. Public Read Access
CREATE POLICY "Partner assets are publicly viewable" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'partner-assets' );

-- 2. Partner Write Access (using folder structure strategy)
-- Strategy: The folder name MUST match the partner_id
-- And that partner MUST belong to the authenticated user
CREATE POLICY "Partners can upload their own assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'partner-assets' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id::text = (storage.foldername(name))[1] -- Folder name is partner ID
      AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can update their own assets" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'partner-assets' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can delete their own assets" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'partner-assets' 
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
    )
  )
);
