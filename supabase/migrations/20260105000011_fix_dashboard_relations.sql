-- Migration to fix missing relationships for Partner Dashboard
-- 1. Ensure user_profiles.user_id is UNIQUE (required for FK reference)
-- 2. Add FK from bookings.user_id -> user_profiles.user_id
-- 3. Add FK from reviews.user_id -> user_profiles.user_id
-- 4. Add FK from bookings.variant_id (or appropriate column) -> offer_variants.id

DO $$
BEGIN
    -- 1. Ensure user_profiles.user_id is UNIQUE
    -- It should be 1:1 with auth.users, so user_id should be unique.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'user_profiles_user_id_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
    END IF;

    -- 2. Add FK from bookings to user_profiles
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_user_id_fkey_profiles'
    ) THEN
        -- Verify bookings has user_id column
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_id') THEN
            ALTER TABLE bookings 
            ADD CONSTRAINT bookings_user_id_fkey_profiles 
            FOREIGN KEY (user_id) 
            REFERENCES user_profiles(user_id);
        END IF;
    END IF;

    -- 3. Add FK from reviews to user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_user_id_fkey_profiles'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'user_id') THEN
            ALTER TABLE reviews 
            ADD CONSTRAINT reviews_user_id_fkey_profiles 
            FOREIGN KEY (user_id) 
            REFERENCES user_profiles(user_id);
        END IF;
    END IF;

    -- 4. Add FK from bookings to offer_variants
    -- Check for variant_id or offer_variant_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_variant_id_fkey'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'variant_id') THEN
            ALTER TABLE bookings 
            ADD CONSTRAINT bookings_variant_id_fkey 
            FOREIGN KEY (variant_id) 
            REFERENCES offer_variants(id);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'offer_variant_id') THEN
             ALTER TABLE bookings 
            ADD CONSTRAINT bookings_offer_variant_id_fkey 
            FOREIGN KEY (offer_variant_id) 
            REFERENCES offer_variants(id);
        END IF;
    END IF;

END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
