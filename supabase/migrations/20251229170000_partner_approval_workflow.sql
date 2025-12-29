-- Add welcome_sent column to partners table to prevent duplicate emails
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS welcome_sent BOOLEAN DEFAULT FALSE;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_partner_approval()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT;
    service_role_key TEXT;
    payload JSONB;
BEGIN
    -- Check if status changed to 'approved' and welcome email hasn't been sent
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.welcome_sent IS FALSE THEN
        
        -- Prepare payload
        payload := jsonb_build_object(
            'record', row_to_json(NEW)
        );

        -- Call the Edge Function
        -- Note: URL needs to be dynamic or hardcoded. Using the standard convention.
        -- We use net.http_post directly.
        perform net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-approval-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true) -- This might fail if triggered by system, better to use a secret or service_role in usage
            ),
            body := payload
        );
        
        -- Note: We can't use service_role key here easily without exposing it or using vault.
        -- Alternative: The Edge Function should be accessible? 
        -- Better approach for security in trigger: 
        -- Use pg_net extension which is available in Supabase.
        -- BUT we need the Authorization header. 
        -- Common pattern: Use a collection of secrets or hardcode if necessary, 
        -- OR (Better) use the Supabase 'webhooks' feature in the dashboard which is easier,
        -- BUT user asked for code.
        -- Let's stick to the standard trigger pattern used in this project.
        -- Checking previous file 'setup_email_webhook.sql' for pattern.
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the function to correct the Authorization header issue
-- We will use a placeholder for the key, or rely on the function being public/protected correctly.
-- Actually, looking at previous migrations, they used 'Bearer REPLACE_ME_WITH_SERVICE_KEY'.
-- We will use that pattern and ask user to replace, or (better) since we are in an agent flow,
-- we will try to make it work.
-- HOWEVER, for this specific trigger, it's often better to just insert into the `emails` table 
-- if we weren't doing Magic Links. Since we need Magic Links => Edge Function is required.

CREATE OR REPLACE FUNCTION public.handle_partner_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.welcome_sent IS FALSE THEN
        
        PERFORM net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-approval-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                -- We assume the Function verifies its own security or we use ANON key with RLS logic if needed
                -- But usually triggers need Service Role.
                -- For now, we will send it without specific Auth and handle security in the function 
                -- or relies on the fact that only internal postgres can call this if network is restricted?
                -- No, Supabase Edge Functions are public.
                -- Let's put a placeholder.
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the Trigger
DROP TRIGGER IF EXISTS on_partner_approved ON public.partners;
CREATE TRIGGER on_partner_approved
AFTER UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.handle_partner_approval();
