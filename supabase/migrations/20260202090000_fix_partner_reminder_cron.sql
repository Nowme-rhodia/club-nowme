-- FIX PARTNER REMINDER CRON
-- Only send reminders to partners who are APPROVED.

CREATE OR REPLACE FUNCTION public.send_partner_reminders()
RETURNS void AS $$
DECLARE
    partner_record RECORD;
    reminder_count INT := 0;
BEGIN
    -- Find partners created between 5 and 6 days ago (Day 5 target), who are not fully established
    -- "Not fully established" = No user_profile linked AND reminder_sent is FALSE
    -- ADDED: Partner must be APPROVED (status = 'approved')
    
    FOR partner_record IN 
        SELECT p.id, p.contact_email, p.business_name, p.contact_name
        FROM public.partners p
        LEFT JOIN public.user_profiles up ON p.id = up.partner_id
        WHERE up.id IS NULL 
        AND p.reminder_sent IS FALSE
        AND p.status = 'approved' -- Only approved partners
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
        
        -- Update local flag immediately
        UPDATE public.partners SET reminder_sent = TRUE WHERE id = partner_record.id;
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Sent % reminders', reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
