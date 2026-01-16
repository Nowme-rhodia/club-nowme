-- 1. Fix Ambassador Foreign Key Relationship
-- Uses a DO block to safely handle constraint checking/dropping
DO $$
BEGIN
    -- Try to drop existing constraint if it conflicts
    BEGIN
        ALTER TABLE public.ambassador_applications 
        DROP CONSTRAINT IF EXISTS ambassador_applications_user_id_fkey_profiles;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Add the correct constraint to user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ambassador_applications_user_id_fkey_profiles'
    ) THEN
        ALTER TABLE public.ambassador_applications
        ADD CONSTRAINT ambassador_applications_user_id_fkey_profiles
        FOREIGN KEY (user_id)
        REFERENCES public.user_profiles(user_id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create Admin Views for Stats
-- Partner Stats View
-- Notes: 
-- - 'reviews' links to 'offers', not 'partners'.
-- - 'bookings' uses 'amount' for price, not 'price'.
-- - 'offers' uses 'status' (approved) not 'is_active'.
CREATE OR REPLACE VIEW public.admin_partner_stats AS
SELECT 
    p.id as partner_id,
    p.business_name,
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(SUM(b.amount), 0) as total_revenue,
    COUNT(DISTINCT o.id) as active_offers,
    COUNT(DISTINCT r.id) as total_reviews,
    COALESCE(AVG(r.rating), 0) as average_rating
FROM public.partners p
LEFT JOIN public.offers o ON o.partner_id = p.id
LEFT JOIN public.bookings b ON b.offer_id = o.id AND b.status IN ('confirmed', 'completed')
LEFT JOIN public.reviews r ON r.offer_id = o.id
WHERE (o.status = 'approved' OR o.id IS NULL)
GROUP BY p.id, p.business_name;

GRANT SELECT ON public.admin_partner_stats TO service_role;
GRANT SELECT ON public.admin_partner_stats TO authenticated;

-- Subscriber Stats View
-- UPDATED: Uses subqueries to avoid cross-join sum errors and includes organized_squads
CREATE OR REPLACE VIEW public.admin_subscriber_stats AS
SELECT 
    up.user_id,
    (
        SELECT COUNT(*) 
        FROM public.bookings b 
        WHERE b.user_id = up.user_id 
        AND b.status IN ('confirmed', 'completed')
    ) as total_bookings,
    (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.bookings b 
        WHERE b.user_id = up.user_id 
        AND b.status IN ('confirmed', 'completed')
    ) as total_spent,
    (
        SELECT COUNT(*) 
        FROM public.subscriptions s 
        WHERE s.user_id = up.user_id 
        AND s.status = 'active'
    ) as active_subscriptions,
    (
        SELECT COUNT(*) 
        FROM public.micro_squads ms 
        WHERE ms.creator_id = up.user_id
    ) as organized_squads
FROM public.user_profiles up;

GRANT SELECT ON public.admin_subscriber_stats TO service_role;
GRANT SELECT ON public.admin_subscriber_stats TO authenticated;

-- 3. Re-schedule Newsletter Cron
-- Cleanly removes and recreates the cron job
DO $outer$
BEGIN
    PERFORM cron.unschedule('process-newsletters');
    PERFORM cron.schedule(
        'process-newsletters',
        '*/30 * * * *',
        $cron_sql$
        SELECT
          net.http_post(
            url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/process-scheduled-newsletters',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
          ) as request_id;
        $cron_sql$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cron scheduling failed or skipped: %', SQLERRM;
END $outer$;
