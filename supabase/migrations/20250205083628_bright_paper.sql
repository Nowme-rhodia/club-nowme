-- Enable RLS on __supabase_migrations table
ALTER TABLE __supabase_migrations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read migrations
CREATE POLICY "Allow authenticated users to read migrations"
  ON __supabase_migrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert migrations
CREATE POLICY "Allow authenticated users to insert migrations"
  ON __supabase_migrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update migrations
CREATE POLICY "Allow authenticated users to update migrations"
  ON __supabase_migrations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy to allow authenticated users to delete migrations
CREATE POLICY "Allow authenticated users to delete migrations"
  ON __supabase_migrations
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment explaining the table's purpose
COMMENT ON TABLE __supabase_migrations IS 'Table for tracking database migrations';