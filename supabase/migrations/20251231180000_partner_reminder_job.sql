-- PARTNER REMINDER JOB
-- 1. Add reminder_sent flag
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- 2. Create the reminder function
CREATE OR REPLACE FUNCTION public.send_partner_reminders()
RETURNS void AS $$
DECLARE
    partner_record RECORD;
    reminder_count INT := 0;
BEGIN
    -- Find partners created between 5 and 6 days ago (Day 5 target), who are not fully established
    -- "Not fully established" = No user_profile linked AND reminder_sent is FALSE
    
    FOR partner_record IN 
        SELECT p.id, p.contact_email, p.business_name, p.contact_name
        FROM public.partners p
        LEFT JOIN public.user_profiles up ON p.id = up.partner_id
        WHERE up.id IS NULL 
        AND p.reminder_sent IS FALSE
        AND p.created_at >= now() - interval '6 days'
        AND p.created_at <= now() - interval '5 days'
    LOOP
        -- Trigger Edge Function for each partner
        PERFORM net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-expiration-reminder',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object('record', row_to_json(partner_record))
        );
        
        -- Update local flag immediately (though Edge Fn also does it, this prevents double send if job re-runs quickly)
        UPDATE public.partners SET reminder_sent = TRUE WHERE id = partner_record.id;
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Sent % reminders', reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule the cron job (Daily at 10:00 AM)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule if exists
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-partner-reminders') THEN
             PERFORM cron.unschedule('daily-partner-reminders');
        END IF;
        
        PERFORM cron.schedule(
            'daily-partner-reminders',
            '0 10 * * *', -- 10:00 AM Daily
            'SELECT public.send_partner_reminders()'
        );
    END IF;
END $$;
