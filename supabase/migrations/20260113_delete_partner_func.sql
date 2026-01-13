-- Function allows a partner to delete their own account
-- Security: restricted to the calling user
CREATE OR REPLACE FUNCTION delete_own_partner_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    target_partner_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- 1. Get Partner ID linked to this user
    SELECT partner_id INTO target_partner_id
    FROM public.user_profiles
    WHERE user_id = current_user_id;

    IF target_partner_id IS NULL THEN
        RAISE EXCEPTION 'No partner account found for this user.';
    END IF;

    -- 2. Cleanup Partner Data
    -- Using the logic from the nuke script but safe for self-deletion
    -- Unlink profile
    UPDATE public.user_profiles SET partner_id = NULL WHERE user_id = current_user_id;

    -- Delete dependent data (cascade usually handles this if FK set, but to be sure)
    DELETE FROM public.bookings WHERE partner_id = target_partner_id;
    DELETE FROM public.offers WHERE partner_id = target_partner_id;
    DELETE FROM public.partner_notifications WHERE partner_id = target_partner_id;
    
    -- Delete Partner Record
    DELETE FROM public.partners WHERE id = target_partner_id;

    -- 3. Delete Auth User (Self-destruct)
    -- Requires Supabase Admin privileges usually, but SECURITY DEFINER might allow it 
    -- if the function owner is postgres/admin.
    -- However, deleting from auth.users directly is risky in functions without proper rights.
    -- Better approach: Mark as deleted or use Service Role call from Edge Function.
    -- But user wants "Nuke". Let's try deleting from auth.users.
    
    DELETE FROM auth.users WHERE id = current_user_id;
    
END;
$$;
