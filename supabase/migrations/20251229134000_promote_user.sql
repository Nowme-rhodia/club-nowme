-- Script: Promote user to subscriber
-- Created at: 2025-12-29T13:40:00.000Z

DO $$
DECLARE
    target_email TEXT := 'nowme.club@gmail.com';
    target_user_id UUID;
BEGIN
    -- 1. Find the user ID from auth.users (or user_profiles if we rely on that)
    -- Ideally we look up in auth.users but we can only manipulate public tables easily here
    -- Let's look up in user_profiles first.
    
    SELECT user_id INTO target_user_id
    FROM user_profiles
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in user_profiles. Checking auth.users via lookups is restricted in DO block usually.', target_email;
        -- We will try to update solely based on what we find. 
        -- If null, we can't do much without the ID.
        -- Assuming user has signed up already.
    ELSE
        RAISE NOTICE 'Found user % with ID %', target_email, target_user_id;

        -- 2. Update Role in user_profiles to 'subscriber' (if column exists, or just rely on subscription)
        -- Actually, the role is often derived from the 'subscriptions' table in this app (ClubDashboard logic).
        -- But let's check if there is a 'role' column just in case.
        -- Based on previous context, 'role' is derived. 'role' column might exist.
        
        -- UPDATE user_profiles SET role = 'subscriber' WHERE user_id = target_user_id; 
        -- (Commented out if column doesn't exist, but safe to try if we knew schema).
        -- Let's stick to inserting a valid subscription.

        -- 3. Upsert Active Subscription
        INSERT INTO subscriptions (
            user_id,
            status,
            stripe_subscription_id,
            stripe_customer_id,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            plan_id
        ) VALUES (
            target_user_id,
            'active',
            'sub_manual_test_' || floor(random() * 10000)::text,
            'cus_manual_test',
            NOW(),
            NOW() + INTERVAL '1 year', -- Valid for 1 year
            false,
            'plan_test'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            status = 'active',
            current_period_end = NOW() + INTERVAL '1 year';
            
        RAISE NOTICE 'User % is now an active subscriber.', target_email;
    END IF;
END $$;
