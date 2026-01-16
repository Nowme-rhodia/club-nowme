-- Enable RLS
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.offer_categories;

-- Create permissive policy for SELECT
CREATE POLICY "Categories are viewable by everyone"
ON public.offer_categories FOR SELECT
USING ( true );

-- Grant permissions to anon (public) role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.offer_categories TO anon;

-- Verify if data exists (this will return count in the results if run in SQL editor)
SELECT count(*) as category_count FROM public.offer_categories;
