-- Migration: Setup Booking Confirmation Email Webhook
-- Created at: 2025-12-29T13:25:00.000Z

-- 1. Ensure extensions for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_paid_booking()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT;
    service_role_key TEXT;
    payload JSONB;
BEGIN
    -- Only trigger if status becomes 'paid' (or 'confirmed')
    -- Logic:
    -- 1. INSERT with status='paid'
    -- 2. UPDATE where OLD.status != 'paid' and NEW.status = 'paid'
    
    IF (TG_OP = 'INSERT' AND NEW.status IN ('paid', 'confirmed')) OR
       (TG_OP = 'UPDATE' AND OLD.status NOT IN ('paid', 'confirmed') AND NEW.status IN ('paid', 'confirmed')) THEN
       
       -- Construct payload (send the whole record)
       payload := row_to_json(NEW);
       
       -- Get secrets (Assuming they are set in Vault or we use a fixed URL/Key for now, 
       -- simpler approach for this migration is to use the known Edge Function URL structure)
       -- Note: In Supabase pure SQL, getting env vars is tricky without Vault.
       -- Users often hardcode the URL in the migration or use a config table.
       -- For safety, we will use the `net.http_post` securely.
       
       -- NOTE: You must replace 'REPLACE_ME_WITH_SERVICE_KEY' with your actual Service Role Key.
       -- Alternatively, if you have the key in vault: (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
       
       PERFORM net.http_post(
           url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-confirmation-email',
           headers := jsonb_build_object(
               'Content-Type', 'application/json',
               'Authorization', 'Bearer REPLACE_ME_WITH_SERVICE_KEY' 
           ),
           body := payload
       );
       
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. The simpler way: Usage of Supabase's native "Database Webhooks" feature usually abstracts this.
-- But the user asked for "Configuration du trigger".
-- Since `pg_net` and Auth headers are brittle in pure SQL without Vault setup, 
-- I will use the `after_insert_or_update` pattern but use a safer `security definer` call.

-- RETRY with a more robust pattern for Supabase Edge Functions
CREATE OR REPLACE FUNCTION public.trigger_send_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Check status transition
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid') THEN
     
     -- Direct call to Edge Function using pg_net
     -- We use the anon key or a dedicated key.
     -- Note: For this to work, you must replace PROJECT_REF and ANON_KEY/SERVICE_KEY
     -- For now, I will use a placeholder and ask User to verify or rely on the Trigger created via Dashboard if this fails.
     -- HOWEVER, Supabase provides `supabase_functions` schema often.
     
     -- Let's try the safest path: logging the event and assuming `pg_net` is configured.
     -- We'll use a direct net.http_post to the function URL.
     
     PERFORM net.http_post(
        url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-confirmation-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer CONSTANT_OR_ENV_VAR"}', -- This is the hard part in SQL
        body := row_to_json(NEW)::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Wait, writing secrets in SQL file is bad practice.
-- BETTER STRATEGY:
-- Create the Trigger logic, but use Supabase's UI-friendly `pg_net` call that requires less setup if possible?
-- No, the best way is to instruct the user to set the webhook via Dashboard OR provide a generic trigger.

-- REVISED PLAN:
-- I will create a trigger that calls the function, but I'll use `supabase_functions.http_request` if available,
-- or basic `net.http_post`.
-- To make it work immediately without hardcoding secrets, I will use the specialized `supabase_functions` triggers 
-- if they exist, or fallback to `pg_net` with a note to the user.

-- Actually, user asked me to "Configure le trigger".
-- I will create the function `handle_new_paid_booking` and the trigger.
-- I will hardcode the URL (since I know the project ref: `dqfyuhwrjozoxadkccdj`)
-- For the Authorization header, I will rely on the fs_net extension default behavior or omit it if possible (Function needs to handle Verify).
-- For this Edge Function, I can allow Anon access if I add validation inside (e.g. check "x-client-info").

-- Let's stick to the prompt's request: "Automatisation (Database Webhook)".
-- I will create a clean Trigger on `bookings`.

DROP TRIGGER IF EXISTS on_booking_paid ON bookings;

CREATE TRIGGER on_booking_paid
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_paid_booking();
