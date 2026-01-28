-- Add column to track last reminder for Stripe Connect
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS last_stripe_connect_reminder_at TIMESTAMPTZ;

-- Function to check for partners without Stripe Connect and queue emails
CREATE OR REPLACE FUNCTION public.check_stripe_connect_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    partner_record RECORD;
    email_subject TEXT;
    email_content TEXT;
    reminder_count INT := 0;
BEGIN
    -- Loop through partners who:
    -- 1. Have no stripe_account_id (or it is empty)
    -- 2. Have a contact_email
    -- 3. Have NOT been reminded in the last 15 days (or never)
    FOR partner_record IN 
        SELECT id, business_name, contact_name, contact_email
        FROM public.partners
        WHERE (stripe_account_id IS NULL OR stripe_account_id = '')
          AND contact_email IS NOT NULL
          AND (last_stripe_connect_reminder_at IS NULL OR last_stripe_connect_reminder_at < NOW() - INTERVAL '15 days')
    LOOP
        email_subject := 'Important : Connectez votre compte Stripe pour recevoir vos paiements';
        
        email_content := '<p>Bonjour ' || COALESCE(partner_record.contact_name, 'Partenaire') || ',</p>' ||
                         '<p>Nous avons remarqué que vous n''avez pas encore connecté votre compte Stripe sur votre espace partenaire Nowme.</p>' ||
                         '<p>C''est une étape <strong>obligatoire</strong> pour que nous puissions automatiser les virements de vos revenus vers votre compte bancaire.</p>' ||
                         '<p>Cela ne prend que quelques minutes et est entièrement sécurisé.</p>' ||
                         '<p><a href="https://club.nowme.fr/partner/settings/payments" style="background-color: #E93CA8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Connecter mon compte Stripe</a></p>' ||
                         '<p>Si vous avez besoin d''aide, n''hésitez pas à nous contacter.</p>' ||
                         '<p>À très vite,<br>L''équipe Nowme</p>';

        -- Insert into emails table to be processed by the worker
        INSERT INTO public.emails (to_address, subject, content, status)
        VALUES (partner_record.contact_email, email_subject, email_content, 'pending');

        -- Update the reminder timestamp
        UPDATE public.partners 
        SET last_stripe_connect_reminder_at = NOW()
        WHERE id = partner_record.id;
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Queued % Stripe Connect reminders', reminder_count;
END;
$$;

-- Schedule the function to run every day at 09:00 AM Europe/Paris using pg_cron
-- We check if pg_cron extension is available first to avoid errors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule if exists to avoid duplicates/errors
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-stripe-connect-reminder') THEN
             PERFORM cron.unschedule('daily-stripe-connect-reminder');
        END IF;

        -- Schedule for 9:00 AM daily
        PERFORM cron.schedule(
            'daily-stripe-connect-reminder',
            '0 9 * * *', 
            'SELECT public.check_stripe_connect_status()'
        );
    END IF;
END $$;
