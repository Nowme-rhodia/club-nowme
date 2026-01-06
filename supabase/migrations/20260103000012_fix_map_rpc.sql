-- Fix RPC function to use photo_url instead of avatar_url
DROP FUNCTION IF EXISTS get_safe_community_locations();

CREATE OR REPLACE FUNCTION get_safe_community_locations()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  photo_url text,
  safe_latitude double precision,
  safe_longitude double precision
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.first_name,
    up.photo_url,
    -- Add random offset (approx 3-5km)
    (up.latitude + (random() * (0.045 - 0.027) + 0.027) * (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)) as safe_latitude,
    (up.longitude + (random() * (0.045 - 0.027) + 0.027) * (CASE WHEN random() > 0.5 THEN 1 ELSE -1 END)) as safe_longitude
  FROM 
    user_profiles up
  WHERE 
    up.latitude IS NOT NULL 
    AND up.longitude IS NOT NULL;
END;
$$;
