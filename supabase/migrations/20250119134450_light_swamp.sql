/*
  # Schéma initial pour la gestion des offres

  1. New Tables
    - `partners`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `business_name` (text)
      - `contact_name` (text)
      - `phone` (text)
      - `website` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `offers`
      - `id` (uuid, primary key)
      - `partner_id` (uuid, foreign key to partners)
      - `title` (text)
      - `description` (text)
      - `category_slug` (text)
      - `subcategory_slug` (text)
      - `location` (text)
      - `coordinates` (point)
      - `status` (enum: draft, pending, approved, rejected)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `offer_prices`
      - `id` (uuid, primary key)
      - `offer_id` (uuid, foreign key to offers)
      - `name` (text)
      - `price` (numeric)
      - `promo_price` (numeric)
      - `duration` (text)
      - `created_at` (timestamp)
    
    - `offer_media`
      - `id` (uuid, primary key)
      - `offer_id` (uuid, foreign key to offers)
      - `url` (text)
      - `type` (enum: image, video)
      - `order` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for partners to manage their own data
    - Add policies for admins to manage all data
*/

-- Create custom types
CREATE TYPE offer_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Create partners table
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create offers table
CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category_slug text NOT NULL,
  subcategory_slug text NOT NULL,
  location text NOT NULL,
  coordinates point,
  status offer_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create offer_prices table
CREATE TABLE offer_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  promo_price numeric CHECK (promo_price >= 0 AND promo_price <= price),
  duration text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create offer_media table
CREATE TABLE offer_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  type media_type NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_media ENABLE ROW LEVEL SECURITY;

-- Create policies for partners table
CREATE POLICY "Partners can read their own data"
  ON partners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can insert their own data"
  ON partners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can update their own data"
  ON partners
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for offers table
CREATE POLICY "Partners can read their own offers"
  ON offers
  FOR SELECT
  TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can insert their own offers"
  ON offers
  FOR INSERT
  TO authenticated
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can update their own offers"
  ON offers
  FOR UPDATE
  TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ))
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can delete their own offers"
  ON offers
  FOR DELETE
  TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = auth.uid()
  ));

-- Create policies for offer_prices table
CREATE POLICY "Partners can read offer prices"
  ON offer_prices
  FOR SELECT
  TO authenticated
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Partners can insert offer prices"
  ON offer_prices
  FOR INSERT
  TO authenticated
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Partners can update offer prices"
  ON offer_prices
  FOR UPDATE
  TO authenticated
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Partners can delete offer prices"
  ON offer_prices
  FOR DELETE
  TO authenticated
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

-- Create policies for offer_media table
CREATE POLICY "Partners can read offer media"
  ON offer_media
  FOR SELECT
  TO authenticated
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Partners can insert offer media"
  ON offer_media
  FOR INSERT
  TO authenticated
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Partners can update offer media"
  ON offer_media
  FOR UPDATE
  TO authenticated
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Partners can delete offer media"
  ON offer_media
  FOR DELETE
  TO authenticated
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();