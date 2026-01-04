-- 1. Add location columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2. Create Secure RPC function to get blurred locations
-- This function returns a random offset of ~3-5km for each user
CREATE OR REPLACE FUNCTION get_safe_community_locations()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  photo_url text,
  safe_latitude double precision,
  safe_longitude double precision
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to ensure we can read lat/long but only expose the calculated safe version
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.first_name,
    up.photo_url,
    -- Add random offset (approx 3-5km)
    -- 1 degree lat ~= 111km. 3km ~= 0.027 deg, 5km ~= 0.045 deg
    -- Formula: original + (random_between_0.027_and_0.045) * (random_direction)
    (up.latitude + (random() * (0.045 - 0.027) + 0.027) * (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)) as safe_latitude,
    (up.longitude + (random() * (0.045 - 0.027) + 0.027) * (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)) as safe_longitude
  FROM 
    user_profiles up
  WHERE 
    up.latitude IS NOT NULL 
    AND up.longitude IS NOT NULL;
END;
$$;

-- 3. Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION get_safe_community_locations TO authenticated;

-- 4. Enable RLS on the new columns for the owner (so they can update their own location)
-- Note: Assuming existing 'Users can update own profile' policy handles 'UPDATE user_profiles' generally.
-- If strict column-level security is in place, you might need specific policies, but usually standard RLS covers row-level updates.
