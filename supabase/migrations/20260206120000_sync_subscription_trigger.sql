-- Function to sync user_profiles -> subscriptions
CREATE OR REPLACE FUNCTION public.sync_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if status is becoming active/trialing/payment_pending
    IF NEW.subscription_status IN ('active', 'trialing', 'payment_pending') THEN
        -- Check if it wasn't already that status (avoid infinite loops/redundant writes)
        -- OR if the record doesn't exist in subscriptions
        
        -- Insert or Update subscriptions
        INSERT INTO public.subscriptions (
            user_id,
            status,
            stripe_subscription_id,
            current_period_end,
            cancel_at_period_end,
            updated_at,
            created_at
        )
        VALUES (
            NEW.user_id,
            NEW.subscription_status,
            NEW.stripe_subscription_id,
            -- Default to 30 days if not present (safeguard)
            COALESCE(
                (SELECT current_period_end FROM public.subscriptions WHERE user_id = NEW.user_id),
                NOW() + INTERVAL '30 days'
            ),
            FALSE,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            status = NEW.subscription_status,
            stripe_subscription_id = COALESCE(NEW.stripe_subscription_id, public.subscriptions.stripe_subscription_id),
            updated_at = NOW();
            
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_user_profile_update_sync_sub ON public.user_profiles;

CREATE TRIGGER on_user_profile_update_sync_sub
AFTER UPDATE OF subscription_status, stripe_subscription_id ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_subscription();
