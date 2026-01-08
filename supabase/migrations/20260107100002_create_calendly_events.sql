-- 1. Table Tampon pour les événements bruts
CREATE TABLE IF NOT EXISTS public.calendly_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'invitee.created', 'invitee.canceled'
    payload JSONB NOT NULL,   -- Le JSON complet envoyé par Calendly
    status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'error'
    error_log TEXT,           -- Pour debugger les échecs de traitement
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- 2. Index pour la performance
-- Recherche rapide par URI (identifiant unique de l'événement Calendly)
CREATE INDEX IF NOT EXISTS idx_calendly_events_uri ON public.calendly_events ((payload->>'uri'));
-- Recherche par email
CREATE INDEX IF NOT EXISTS idx_calendly_events_email ON public.calendly_events ((payload->'payload'->>'email'));

-- 3. Sécurité (RLS)
ALTER TABLE public.calendly_events ENABLE ROW LEVEL SECURITY;

-- Seule la 'service_role' (utilisée par l'Edge Function) peut insérer et mettre à jour
-- Seule la 'service_role' (utilisée par l'Edge Function) peut insérer et mettre à jour
DROP POLICY IF EXISTS "Service Role can full access events" ON public.calendly_events;
CREATE POLICY "Service Role can full access events" ON public.calendly_events
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Seuls les admins peuvent lire (pour debug)
DROP POLICY IF EXISTS "Admins can view raw events" ON public.calendly_events;
CREATE POLICY "Admins can view raw events" ON public.calendly_events
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Grant access
GRANT ALL ON public.calendly_events TO service_role;
GRANT SELECT ON public.calendly_events TO authenticated;
