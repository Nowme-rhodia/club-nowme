-- Create offer_media table
CREATE TABLE IF NOT EXISTS public.offer_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT CHECK (type IN ('image', 'video')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offer_media ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read access for offer media" ON public.offer_media;
CREATE POLICY "Public read access for offer media"
    ON public.offer_media FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Partners can upload media for their own offers" ON public.offer_media;
CREATE POLICY "Partners can upload media for their own offers"
    ON public.offer_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.offers
            WHERE id = offer_media.offer_id
            AND partner_id IN (
                SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Partners can delete their own offer media" ON public.offer_media;
CREATE POLICY "Partners can delete their own offer media"
    ON public.offer_media FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.offers
            WHERE id = offer_media.offer_id
            AND partner_id IN (
                SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Admins can manage all media" ON public.offer_media;
CREATE POLICY "Admins can manage all media"
    ON public.offer_media FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );
