-- Fix schema issues
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure partners table exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS partners (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    business_name text NOT NULL,
    contact_name text NOT NULL,
    phone text NOT NULL,
    website text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS if not already enabled
DO $$ BEGIN
  ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create policies if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partners' 
    AND policyname = 'Partners can read their own data'
  ) THEN
    CREATE POLICY "Partners can read their own data"
      ON partners FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partners' 
    AND policyname = 'Partners can insert their own data'
  ) THEN
    CREATE POLICY "Partners can insert their own data"
      ON partners FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partners' 
    AND policyname = 'Partners can update their own data'
  ) THEN
    CREATE POLICY "Partners can update their own data"
      ON partners FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;