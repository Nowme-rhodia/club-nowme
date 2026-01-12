-- Force enable public access to categories
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.offer_categories;

CREATE POLICY "Categories are viewable by everyone"
ON public.offer_categories FOR SELECT
USING ( true );

-- Ensure anon has usage on schema public (usually default but good to be sure)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
