/*
  # Fix Database Constraints and Orphaned Records

  1. Database Cleanup
    - Fix orphaned user profiles with NULL user_id
    - Remove duplicate user_id entries
    - Clean up corrupted constraints

  2. Constraint Recreation
    - Drop and recreate user_profiles_user_id_key constraint
    - Fix foreign key relationships
    - Add performance indexes

  3. Data Integrity
    - Link orphaned profiles to existing auth users
    - Remove profiles that cannot be linked
*/

-- Step 1: Fix orphaned profiles by linking them to existing auth users
UPDATE user_profiles p
SET user_id = u.id
FROM auth.users u
WHERE p.email = u.email
AND p.user_id IS NULL
AND u.id IS NOT NULL;

-- Step 2: Remove duplicate user_id entries (keep most recent)
WITH duplicates AS (
  SELECT 
    user_id,
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) as row_num
  FROM user_profiles
  WHERE user_id IS NOT NULL
)
DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Step 3: Remove orphaned profiles that still have NULL user_id
DELETE FROM user_profiles
WHERE user_id IS NULL;

-- Step 4: Fix corrupted constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_key;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Step 5: Recreate proper constraints
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Create performance index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Step 7: Add error_message column to stripe_webhook_events if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_webhook_events' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE stripe_webhook_events ADD COLUMN error_message text;
  END IF;
END $$;