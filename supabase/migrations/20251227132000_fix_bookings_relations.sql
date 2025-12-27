-- Migration: Add FK from bookings to user_profiles to allow embedding
-- Created at: 2025-12-27T13:20:00.000Z

-- We need to ensure bookings.user_id references user_profiles.user_id so PostgREST can do the join.
-- First, ensure user_profiles.user_id is unique (it should be, 1:1 with auth.users).

DO $$
BEGIN
    -- Check if user_id in user_profiles is unique. 
    -- If it's the PK, we are good.
    -- If not, verify uniqueness constraint.
    
    -- Try to add the FK. Use a specific name to avoid dupes.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_user_id_fkey_profiles'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_user_id_fkey_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES user_profiles(user_id);
    END IF;
END $$;
