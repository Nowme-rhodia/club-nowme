-- Create private bucket for offer attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-attachments', 'offer-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Add column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS digital_product_file text;

-- Policy: Partners can view/upload/update/delete their own files
-- We assume files are stored as: {partner_id}/{filename}
CREATE POLICY "Partners can manage their own attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'offer-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM partners WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'offer-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM partners WHERE user_id = auth.uid()
  )
);

-- Policy: Customers can view (download) files if they have a confirmed booking
CREATE POLICY "Customers can download purchased files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'offer-attachments' AND
  EXISTS (
    SELECT 1 
    FROM bookings b
    JOIN offers o ON b.offer_id = o.id
    WHERE 
      b.user_id = auth.uid() AND 
      (b.status = 'confirmed' OR b.status = 'paid') AND
      o.digital_product_file = name
  )
);
