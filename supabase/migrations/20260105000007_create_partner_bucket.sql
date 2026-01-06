-- Create storage bucket for partner assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('partner-assets', 'partner-assets', true);

-- Policy: Public can read everything
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'partner-assets' );

-- Policy: Partners can upload their own assets
CREATE POLICY "Partner Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'partner-assets' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Partners can update their own assets
CREATE POLICY "Partner Update" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'partner-assets' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Partners can delete their own assets
CREATE POLICY "Partner Delete" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'partner-assets' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
