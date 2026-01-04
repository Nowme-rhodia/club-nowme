-- Add FK to user_profiles to allow PostgREST joining
-- This works because user_profiles.user_id is 1:1 with auth.users.id
-- We need this so we can do .select('*, user:user_id(...)') where user resolves to user_profiles

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ambassador_applications_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE ambassador_applications
    ADD CONSTRAINT ambassador_applications_user_id_fkey_profiles
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(user_id);
  END IF;
END $$;
