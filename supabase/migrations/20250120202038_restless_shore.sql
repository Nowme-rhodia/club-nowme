/*
  # Authentication System Setup

  1. New Tables
    - `user_profiles`
      - Stores additional user information
      - Links to auth.users
      - Includes phone number with uniqueness constraint
    - `user_qr_codes`
      - Stores QR codes for user identification
      - One-to-one relationship with user_profiles

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add unique constraint on phone numbers
*/

-- Create user_profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text UNIQUE NOT NULL CHECK (phone ~ '^\+?[0-9]{10,15}$'),
  photo_url text,
  subscription_status text NOT NULL DEFAULT 'pending',
  zoho_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user_qr_codes table
CREATE TABLE user_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid REFERENCES user_profiles NOT NULL,
  qr_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_profile_id)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for user_qr_codes
CREATE POLICY "Users can view own QR code"
  ON user_qr_codes
  FOR SELECT
  TO authenticated
  USING (user_profile_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Create updated_at trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();