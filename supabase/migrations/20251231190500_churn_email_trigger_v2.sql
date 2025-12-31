-- Migration: Add Churn Email Trigger (Fix)
-- Created at: 2025-12-31T19:05:00.000Z

-- 1. Create the function to handle subscription cancellation (Update)
CREATE OR REPLACE FUNCTION public.handle_subscription_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
BEGIN
    -- Check if the status changed to 'cancelled' (and wasn't already 'cancelled')
    IF (NEW.subscription_status = 'cancelled' AND (OLD.subscription_status IS DISTINCT FROM 'cancelled')) THEN
        
        -- Fetch email from auth.users table since it is not in user_profiles
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = NEW.user_id;

        -- If email not found (edge case), do nothing or log error
        IF user_email IS NOT NULL THEN
            
            -- Construct the email content
            INSERT INTO public.emails (
                to_address,
                subject,
                content,
                status
            )
            VALUES (
                user_email,
                'Tu vas nous manquer... 💔',
                E'<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; color: #333; line-height: 1.6; }
  .btn { display: inline-block; padding: 12px 24px; background-color: #e11d48; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
  .btn:hover { background-color: #be123c; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="container">
    <div class="header">Quel dommage de te voir partir...</div>
    <p>Bonjour ' || COALESCE(NEW.first_name, 'Unknown') || E',</p>
    
    <p>Nous avons bien pris en compte l\'annulation de ton abonnement. Ton accès au Club restera actif jusqu\'à la fin de ta période en cours.</p>
    
    <p>Nous sommes tristes de te voir partir, mais nous respectons ton choix. Pour nous aider à nous améliorer, pourrais-tu prendre 30 secondes pour nous dire pourquoi ?</p>
    
    <a href="https://tally.so/forms/INSERT_YOUR_ID" class="btn" style="color: white;">Donner mon avis</a>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">On espère te revoir bientôt !<br>L\'équipe Nowme</p>
</div>
</body>
</html>',
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_subscription_cancelled ON public.user_profiles;

CREATE TRIGGER on_subscription_cancelled
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_cancellation();
