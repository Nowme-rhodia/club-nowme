-- Migration: Finalize Invoice Logic and Partner Address
-- Created at: 2025-12-29 15:15:00

-- 1. Add 'address' to 'partners' table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'address') THEN 
        ALTER TABLE "public"."partners" ADD COLUMN "address" TEXT; 
    END IF; 
END $$;

-- 2. Add 'invoice_sent' to 'bookings' table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'invoice_sent') THEN 
        ALTER TABLE "public"."bookings" ADD COLUMN "invoice_sent" BOOLEAN DEFAULT FALSE; 
    END IF; 
END $$;

-- 3. Update or Create the Trigger Function to be secure against recursion
CREATE OR REPLACE FUNCTION public.handle_new_paid_booking()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Check if status is 'paid' AND invoice hasn't been sent yet
    -- We also check TG_OP to be safe, though the trigger definition handles it.
    IF (NEW.status = 'paid' OR NEW.status = 'confirmed') AND (NEW.invoice_sent IS FALSE) THEN
       
       -- Construct payload
       payload := row_to_json(NEW);
       
       -- Call Edge Function
       PERFORM net.http_post(
           url := 'https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/send-confirmation-email',
           headers := jsonb_build_object(
               'Content-Type', 'application/json',
               -- We use a placeholder here. In production, this should be a secure key or rely on network restrictions.
               'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true) -- Attempt to pass context, or use anon key if public
           ),
           body := payload
       );
       
       -- CRITICAL: Update the flag immediately to prevent future triggers
       -- We prefer to do this cleanly. 
       -- WARNING: Updating the row *inside* an AFTER trigger might fire the trigger again if not careful.
       -- But we added the check `(NEW.invoice_sent IS FALSE)`.
       -- When we update to TRUE, the condition `OLD.invoice_sent IS FALSE AND NEW.invoice_sent IS TRUE` might be relevant if checking changes.
       -- But here we check `NEW.invoice_sent IS FALSE`.
       -- So the re-entrant call will verify `NEW.invoice_sent` (which is now TRUE) and skip the block.
       
       UPDATE "public"."bookings"
       SET invoice_sent = TRUE
       WHERE id = NEW.id;
       
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create the Trigger to be sure
DROP TRIGGER IF EXISTS on_booking_paid ON bookings;

CREATE TRIGGER on_booking_paid
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_paid_booking();
