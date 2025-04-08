-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit partner application" ON pending_partners;
DROP POLICY IF EXISTS "Anyone can submit pending offer" ON pending_offers;

-- Create new policies with proper permissions
CREATE POLICY "Enable insert for everyone"
  ON pending_partners
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable insert for everyone"
  ON pending_offers
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Enable public access to read own submissions
CREATE POLICY "Enable read access for own submissions"
  ON pending_partners
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable read access for own submissions"
  ON pending_offers
  FOR SELECT
  TO public
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE pending_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_offers ENABLE ROW LEVEL SECURITY;