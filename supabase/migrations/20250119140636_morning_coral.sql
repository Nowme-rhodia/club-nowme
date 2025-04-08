/*
  # Create pending partners table

  1. New Tables
    - `pending_partners`
      - `id` (uuid, primary key)
      - `business_name` (text)
      - `contact_name` (text)
      - `email` (text)
      - `phone` (text)
      - `status` (enum: 'pending', 'approved', 'rejected')
      - `signup_token` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `pending_offers`
      - `id` (uuid, primary key)
      - `pending_partner_id` (uuid, references pending_partners)
      - `title` (text)
      - `description` (text)
      - `category_slug` (text)
      - `subcategory_slug` (text)
      - `price` (numeric)
      - `location` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin access only
*/

-- Create status enum type
CREATE TYPE pending_partner_status AS ENUM ('pending', 'approved', 'rejected');

-- Create pending_partners table
CREATE TABLE IF NOT EXISTS pending_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status pending_partner_status DEFAULT 'pending',
  signup_token text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pending_offers table
CREATE TABLE IF NOT EXISTS pending_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_partner_id uuid REFERENCES pending_partners ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category_slug text NOT NULL,
  subcategory_slug text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  location text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for pending_partners
CREATE POLICY "Admins can read pending partners"
  ON pending_partners
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert pending partners"
  ON pending_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update pending partners"
  ON pending_partners
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create policies for pending_offers
CREATE POLICY "Admins can read pending offers"
  ON pending_offers
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert pending offers"
  ON pending_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update pending offers"
  ON pending_offers
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create trigger for updated_at
CREATE TRIGGER update_pending_partners_updated_at
  BEFORE UPDATE ON pending_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Allow public access for partner submissions
CREATE POLICY "Anyone can submit partner application"
  ON pending_partners
  FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

CREATE POLICY "Anyone can submit pending offer"
  ON pending_offers
  FOR INSERT
  TO anon;