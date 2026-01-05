-- 💥 SQL NUKE SCRIPT
-- Change the email below to the user you want to delete
DO $$
DECLARE
    target_email TEXT := 'bydjo.heyjo@gmail.com'; -- <--- CHANGE THIS
    target_user_id UUID;
    target_partner_id UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users', target_email;
        -- Optional: Check for orphaned partner by email
        RETURN;
    END IF;

    RAISE NOTICE 'Nuking User: % (ID: %)', target_email, target_user_id;

    -- 2. Check for Partner Link via Profile
    SELECT partner_id INTO target_partner_id
    FROM public.user_profiles
    WHERE user_id = target_user_id;

    IF target_partner_id IS NOT NULL THEN
        RAISE NOTICE 'User is a Partner (ID: %). Deleting partner data...', target_partner_id;

        -- Unlink profile to avoid foreign key issues during deletion
        UPDATE public.user_profiles SET partner_id = NULL WHERE user_id = target_user_id;

        -- Delete Partner Dependencies
        DELETE FROM public.bookings WHERE partner_id = target_partner_id;
        DELETE FROM public.offers WHERE partner_id = target_partner_id;
        DELETE FROM public.partner_notifications WHERE partner_id = target_partner_id;
        
        -- Delete Partner
        DELETE FROM public.partners WHERE id = target_partner_id;
    END IF;

    -- 3. Delete User Dependencies
    -- (Note: user_profiles is usually ON DELETE CASCADE, but we clean others just in case)
    DELETE FROM public.ambassador_applications WHERE user_id = target_user_id;
    DELETE FROM public.squad_members WHERE user_id = target_user_id;
    DELETE FROM public.micro_squads WHERE creator_id = target_user_id;
    DELETE FROM public.events WHERE organizer_id = target_user_id;
    DELETE FROM public.bookings WHERE user_id = target_user_id;
    DELETE FROM public.partner_reviews WHERE user_id = target_user_id;

    -- 4. Delete Auth User (Triggers cascade for user_profiles)
    DELETE FROM auth.users WHERE id = target_user_id;

    RAISE NOTICE '✅ User % has been completely nuked.', target_email;
END $$;
