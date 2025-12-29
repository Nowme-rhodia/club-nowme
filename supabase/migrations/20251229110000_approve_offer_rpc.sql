-- Migration: Create RPC to approve offers securely
-- Description: Creates a SECURITY DEFINER function to approve offers, ensuring Admins can always approve offers regardless of RLS complexity.

CREATE OR REPLACE FUNCTION approve_offer(target_offer_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can approve offers.';
  END IF;

  -- Perform the update
  UPDATE offers
  SET 
    status = 'approved',
    is_approved = true,
    updated_at = NOW()
  WHERE id = target_offer_id;

  RETURN FOUND;
END;
$$;
