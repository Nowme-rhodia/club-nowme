-- Grant free access to admin account
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'nowme.club@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- 1. Update user_profiles (status and type)
        UPDATE public.user_profiles
        SET 
            subscription_status = 'active',
            subscription_type = 'yearly',
            stripe_subscription_id = 'sub_admin_free_tier'
        WHERE user_id = v_user_id;

        -- 2. Upsert into subscriptions (status and period_end)
        IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_user_id) THEN
            UPDATE public.subscriptions
            SET 
                status = 'active',
                stripe_subscription_id = 'sub_admin_free_tier',
                current_period_end = NOW() + INTERVAL '100 years'
            WHERE user_id = v_user_id;
        ELSE
            INSERT INTO public.subscriptions (user_id, status, stripe_subscription_id, current_period_end)
            VALUES (v_user_id, 'active', 'sub_admin_free_tier', NOW() + INTERVAL '100 years');
        END IF;
    END IF;
END $$;
