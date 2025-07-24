/*
  # Fix duplicate policies for user_profiles table

  1. Changes
    - Drop existing policies
    - Recreate policies with proper checks
    - Add service role policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update subscription status" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow Insert from Webhook" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow Update only for Service Role" ON public.user_profiles;

-- Create new policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow Insert from Webhook"
  ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true); 

CREATE POLICY "Allow Update only for Service Role"
  ON public.user_profiles
  FOR UPDATE
  TO service_role
  USING (true)  -- La clause TO service_role est suffisante
  WITH CHECK (true);

-- Add comments
COMMENT ON POLICY "Users can view own profile" ON public.user_profiles IS 'Allow users to view their own profile';
COMMENT ON POLICY "Users can update own profile" ON public.user_profiles IS 'Allow users to update their own profile';
COMMENT ON POLICY "Allow Insert from Webhook" ON public.user_profiles IS 'Allow service role to insert new profiles';
COMMENT ON POLICY "Allow Update only for Service Role" ON public.user_profiles IS 'Allow service role to update profiles';