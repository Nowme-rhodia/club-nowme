-- Create the offer-attachments bucket found missing during debugging
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-attachments', 'offer-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies for offer-attachments

-- 1. Allow public read access (so buyers can download)
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'offer-attachments' );

-- 2. Allow authenticated partners to upload files
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-attachments'
  -- Optional: Restrict path to match user/partner ID if needed, 
  -- but straightforward auth check is sufficient for now as per app logic
);

-- 3. Allow users to update their own files (if needed)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'offer-attachments' AND auth.uid() = owner );

-- 4. Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'offer-attachments' AND auth.uid() = owner );
