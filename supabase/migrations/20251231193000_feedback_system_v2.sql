-- Migration: Create Feedback Table and Update Churn Link (Retry)
-- Created at: 2025-12-31T19:30:00.000Z

-- 1. Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    rating INTEGER,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
CREATE POLICY "Users can insert their own feedback" 
ON public.feedback FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Admins can view all feedback" 
ON public.feedback FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.is_admin = true
    )
);

-- 4. Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_subscription_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Check if the status changed to 'cancelled' (and wasn't already 'cancelled')
    IF (NEW.subscription_status = 'cancelled' AND (OLD.subscription_status IS DISTINCT FROM 'cancelled')) THEN
        
        -- Fetch email from auth.users table
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = NEW.user_id;

        IF user_email IS NOT NULL THEN
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
    
    <a href="https://club.nowme.fr/feedback" class="btn" style="color: white;">Donner mon avis</a>
    
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
