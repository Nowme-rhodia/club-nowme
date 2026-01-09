-- Enable unaccent extension for slug generation
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Create slugify function (reusable)
CREATE OR REPLACE FUNCTION slugify(value text)
RETURNS text AS $$
BEGIN
  -- 1. Unaccent (é -> e)
  -- 2. Lowercase
  -- 3. Replace non-alphanumeric with -
  -- 4. Trim leading/trailing -
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(value),
        '[^a-z0-9\\-_]+', '-', 'gi' -- Replace non-alphanumeric with dash
      ),
      '(^-+|-+$)', '', 'g' -- Trim dashes
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 2. OFFERS TABLE
-- ==========================================

-- Add slug column
ALTER TABLE offers ADD COLUMN IF NOT EXISTS slug text;
-- Add constraint (allow nulls initially for backfill, but intended to be unique)
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS offers_slug_idx ON offers (slug);

-- Function to generate offer slug
CREATE OR REPLACE FUNCTION generate_offer_slug(title text, partner_id uuid, city text, current_id uuid)
RETURNS text AS $$
DECLARE
  partner_name text;
  base_slug text;
  new_slug text;
  counter integer := 0;
BEGIN
  -- Get partner name
  IF partner_id IS NOT NULL THEN
    SELECT business_name INTO partner_name FROM partners WHERE id = partner_id;
  END IF;
  
  -- Create base slug: title-partner-city
  -- Fallback to 'club-nowme' if components missing, though title should exist.
  base_slug := slugify(
    COALESCE(title, '') || '-' || 
    COALESCE(partner_name, '') || '-' || 
    COALESCE(city, '')
  );
  
  -- Security fallback if slug is empty
  IF base_slug IS NULL OR length(base_slug) < 2 THEN
    base_slug := 'offre-' || substring(md5(random()::text) from 1 for 6);
  END IF;

  new_slug := base_slug;
  
  -- Check for collisions (excluding self)
  LOOP
    EXIT WHEN NOT EXISTS (
        SELECT 1 FROM offers 
        WHERE slug = new_slug 
        AND id != current_id
    );
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function
CREATE OR REPLACE FUNCTION set_offer_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if missing or title/city changed (and slug not manually set to something else? Let's just enforce generated if null or matching pattern?)
  -- Simple rule: If slug is null, generate it.
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_offer_slug(NEW.title, NEW.partner_id, NEW.city, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_set_offer_slug ON offers;
CREATE TRIGGER trigger_set_offer_slug
BEFORE INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION set_offer_slug();

-- Backfill existing offers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM offers WHERE slug IS NULL LOOP
    UPDATE offers 
    SET slug = generate_offer_slug(title, partner_id, city, id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- Make slug required (optional, but good practice after backfill)
-- ALTER TABLE offers ALTER COLUMN slug SET NOT NULL;


-- ==========================================
-- 3. PARTNERS TABLE
-- ==========================================

-- Add slug column
ALTER TABLE partners ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS partners_slug_idx ON partners (slug);

-- Function to generate partner slug
-- Function to generate partner slug
CREATE OR REPLACE FUNCTION generate_partner_slug(business_name text, address text, current_id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  city_part text;
  new_slug text;
  counter integer := 0;
BEGIN
  -- Try to extract city from address (text after zip code)
  city_part := substring(address from '[0-9]{5}\s+(.*)$');
  
  base_slug := slugify(
    COALESCE(business_name, '') || 
    CASE WHEN city_part IS NOT NULL AND length(city_part) > 1 THEN '-' || city_part ELSE '' END
  );
  
  IF base_slug IS NULL OR length(base_slug) < 2 THEN
     base_slug := 'partenaire-' || substring(md5(random()::text) from 1 for 6);
  END IF;

  new_slug := base_slug;
  
  LOOP
    EXIT WHEN NOT EXISTS (
        SELECT 1 FROM partners 
        WHERE slug = new_slug 
        AND id != current_id
    );
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function
CREATE OR REPLACE FUNCTION set_partner_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_partner_slug(NEW.business_name, NEW.address, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_set_partner_slug ON partners;
CREATE TRIGGER trigger_set_partner_slug
BEFORE INSERT OR UPDATE ON partners
FOR EACH ROW
EXECUTE FUNCTION set_partner_slug();

-- Backfill existing partners (Regenerate ALL to ensure city is included)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- We regenerate slugs for everyone to fix the missing city
  FOR r IN SELECT * FROM partners LOOP
    UPDATE partners 
    SET slug = generate_partner_slug(business_name, address, id)
    WHERE id = r.id;
  END LOOP;
END $$;
