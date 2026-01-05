-- 💥 SQL NUKE SCRIPT (FINAL MANUAL EDITION)
-- Change the email below to the user you want to delete
DO $$
DECLARE
    target_email TEXT := 'bydjo.heyjo@gmail.com'; -- <--- CHANGE THIS
    target_user_id UUID;
    target_partner_id UUID;
    target_profile_id UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users', target_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Nuking User: % (ID: %)', target_email, target_user_id;

    -- 2. Get Profile ID (for rewards/linking)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        EXECUTE 'SELECT id, partner_id FROM public.user_profiles WHERE user_id = $1' 
        INTO target_profile_id, target_partner_id 
        USING target_user_id;
    END IF;

    -- 3. PARTNER CLEANUP
    IF target_partner_id IS NOT NULL THEN
        RAISE NOTICE 'User is a Partner (ID: %). Deleting partner data...', target_partner_id;

        -- Unlink profile first
        EXECUTE 'UPDATE public.user_profiles SET partner_id = NULL WHERE user_id = $1' USING target_user_id;

        -- Safe Delete Dependencies
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
            EXECUTE 'DELETE FROM public.bookings WHERE partner_id = $1' USING target_partner_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offers') THEN
            EXECUTE 'DELETE FROM public.offers WHERE partner_id = $1' USING target_partner_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_notifications') THEN
            EXECUTE 'DELETE FROM public.partner_notifications WHERE partner_id = $1' USING target_partner_id;
        END IF;
        
        -- Delete Partner
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partners') THEN
            EXECUTE 'DELETE FROM public.partners WHERE id = $1' USING target_partner_id;
        END IF;
    END IF;

    -- 4. SUBSCRIBER/USER CLEANUP
    RAISE NOTICE 'Deleting subscriber and user data...';

    -- [A] Tables using 'user_id'
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        EXECUTE 'DELETE FROM public.subscriptions WHERE user_id = $1' USING target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_suggestions') THEN
        EXECUTE 'DELETE FROM public.community_suggestions WHERE user_id = $1' USING target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ambassador_applications') THEN
        EXECUTE 'DELETE FROM public.ambassador_applications WHERE user_id = $1' USING target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'squad_members') THEN
        EXECUTE 'DELETE FROM public.squad_members WHERE user_id = $1' USING target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_reviews') THEN
        EXECUTE 'DELETE FROM public.partner_reviews WHERE user_id = $1' USING target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        EXECUTE 'DELETE FROM public.bookings WHERE user_id = $1' USING target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_rewards') AND target_profile_id IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.member_rewards WHERE user_id = $1' USING target_profile_id;
    END IF;


    -- [B] Tables using 'creator_id' or 'organizer_id'
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'micro_squads') THEN
        EXECUTE 'DELETE FROM public.micro_squads WHERE creator_id = $1' USING target_user_id;
    END IF;
    -- IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    --    EXECUTE 'DELETE FROM public.events WHERE organizer_id = $1' USING target_user_id;
    -- END IF;

    -- 5. DELETE AUTH USER
    DELETE FROM auth.users WHERE id = target_user_id;

    RAISE NOTICE '✅ User % has been completely nuked.', target_email;
END $$;
