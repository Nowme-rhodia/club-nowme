-- 🛡️ SECURE ADMIN ACCESS HELPERS
-- Matches Supabase AI recommendation: "Option A — Frontend reads DB (via secure view)"

-- 1. Create a secure view for the current user's admin status
CREATE OR REPLACE VIEW public.current_user_admin AS
SELECT 
    up.user_id, 
    up.is_admin,
    u.email
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE up.user_id = auth.uid();

-- 2. Grant access to this view for authenticated users
GRANT SELECT ON public.current_user_admin TO authenticated;

-- 3. (Optional but recommended) RPC helper for single-line check
CREATE OR REPLACE FUNCTION public.am_i_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = auth.uid() 
      AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant access to the RPC
GRANT EXECUTE ON FUNCTION public.am_i_admin TO authenticated;
