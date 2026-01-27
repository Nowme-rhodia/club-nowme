
-- Add a column to track when the last reminder was sent
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS last_draft_reminder_at TIMESTAMPTZ;

-- Function to check for stale drafts and queue emails
CREATE OR REPLACE FUNCTION public.check_stale_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stale_offer RECORD;
    partner_email TEXT;
    partner_name TEXT;
    email_subject TEXT;
    email_content TEXT;
BEGIN
    -- Loop through offers that are draft or ready, older than 24h, and haven't been reminded in the last 7 days (or ever)
    FOR stale_offer IN 
        SELECT o.id, o.title, o.partner_id, o.status, p.contact_email, p.contact_name
        FROM public.offers o
        JOIN public.partners p ON o.partner_id = p.id
        WHERE (o.status = 'draft' OR o.status = 'ready')
          AND o.created_at < NOW() - INTERVAL '24 hours'
          AND (o.last_draft_reminder_at IS NULL OR o.last_draft_reminder_at < NOW() - INTERVAL '7 days')
          AND p.contact_email IS NOT NULL
    LOOP
        partner_email := stale_offer.contact_email;
        partner_name := COALESCE(stale_offer.contact_name, 'Partenaire');
        
        email_subject := 'N''oubliez pas de soumettre votre offre : ' || stale_offer.title;
        
        email_content := '<p>Bonjour ' || partner_name || ',</p>' ||
                         '<p>Vous avez commencé à rédiger l''offre <strong>' || stale_offer.title || '</strong> il y a plus de 24 heures.</p>' ||
                         '<p>Si elle est prête, n''oubliez pas de la soumettre pour validation afin qu''elle puisse être publiée sur le Club Nowme !</p>' ||
                         '<p>Statut actuel : <strong>' || CASE WHEN stale_offer.status = 'draft' THEN 'Brouillon' ELSE 'Prête (à soumettre)' END || '</strong></p>' ||
                         '<p><a href="https://club.nowme.fr/partner/offers?edit_offer_id=' || stale_offer.id || '">Cliquez ici pour finaliser votre offre</a></p>' ||
                         '<p>À très vite,<br>L''équipe Nowme</p>';

        -- Insert into emails table (assuming this table exists and is processed by a worker)
        INSERT INTO public.emails (to_address, subject, content, status)
        VALUES (partner_email, email_subject, email_content, 'pending');

        -- Update the reminder timestamp to prevent spam
        UPDATE public.offers 
        SET last_draft_reminder_at = NOW()
        WHERE id = stale_offer.id;
        
    END LOOP;
END;
$$;

-- Schedule the function to run every day at 10:00 AM Europe/Paris
-- Note: managing pg_cron requires superuser or specific extensions. 
-- If pg_cron is available:
-- SELECT cron.schedule('0 10 * * *', 'SELECT public.check_stale_drafts()');

-- Since we might not have direct pg_cron access via migrations in all Supabase setups without explicit enabling,
-- we'll assume the user might need to coordinate this or we rely on an Edge Function to call this RPC.
-- But for now, we define the RPC.
