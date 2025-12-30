-- Fix 401 Error: Re-create the function with a valid Service Role Key
CREATE OR REPLACE FUNCTION public.handle_partner_approval()
RETURNS TRIGGER AS $$
DECLARE
    -- REPLACE THIS VALUE with your actual SUPABASE_SERVICE_ROLE_KEY from .env or Dashboard
    service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZnl1aHdyam96b3hhZGtjY2RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODU5MTU4MSwiZXhwIjoyMDU0MTY3NTgxfQ.WXPj9YGH5H-rCYGzcgAUS0LTZGe9waDkJpxhQTrsqjI'; 
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.welcome_sent IS FALSE THEN
        
        PERFORM net.http_post(
            url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-partner-approval-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_key
            ),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
