/*
  # Add Region Requests Table

  1. New Tables
    - `region_requests`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `region` (text, not null)
      - `created_at` (timestamptz)
      - `notified` (boolean)
      
  2. Security
    - Enable RLS
    - Add policy for public inserts
    - Add policy for admin reads
*/

CREATE TABLE region_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  region text NOT NULL,
  created_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  UNIQUE(email, region)
);

-- Enable RLS
ALTER TABLE region_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for everyone"
  ON region_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read for admins"
  ON region_requests
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add comments
COMMENT ON TABLE region_requests IS 'Requests for Nowme availability in new regions';
COMMENT ON COLUMN region_requests.email IS 'Email address to notify when service becomes available';
COMMENT ON COLUMN region_requests.region IS 'Requested region (department or country)';
COMMENT ON COLUMN region_requests.notified IS 'Whether the user has been notified of availability';