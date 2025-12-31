-- AUTO CLEANUP JOB
-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_database()
RETURNS void AS $$
DECLARE
    deleted_logs_count INT;
    deleted_partners_count INT;
BEGIN
    -- 1. Cleanup old logs (> 30 days)
    DELETE FROM public.email_logs
    WHERE created_at < now() - interval '30 days';
    
    GET DIAGNOSTICS deleted_logs_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old email logs', deleted_logs_count;

    -- 2. Cleanup orphaned partners (> 7 days)
    -- "Orphaned" means they exist in 'partners' but have no linked 'user_profiles'
    -- We use a CTE to identify them first to avoid complex subqueries in DELETEs
    
    CREATE TEMP TABLE IF NOT EXISTS temp_orphaned_partners AS
    SELECT p.id 
    FROM public.partners p
    LEFT JOIN public.user_profiles up ON p.id = up.partner_id
    WHERE up.id IS NULL 
    AND p.created_at < now() - interval '7 days'; -- Safety buffer

    -- Delete linked data for these partners
    
    -- Bookings
    DELETE FROM public.bookings
    WHERE partner_id IN (SELECT id FROM temp_orphaned_partners);
    
    -- Offer Media (linked via offers)
    DELETE FROM public.offer_media
    WHERE offer_id IN (
        SELECT id FROM public.offers WHERE partner_id IN (SELECT id FROM temp_orphaned_partners)
    );
    
    -- Offer Variants (linked via offers)
    DELETE FROM public.offer_variants
    WHERE offer_id IN (
        SELECT id FROM public.offers WHERE partner_id IN (SELECT id FROM temp_orphaned_partners)
    );
    
    -- Offers
    DELETE FROM public.offers
    WHERE partner_id IN (SELECT id FROM temp_orphaned_partners);
    
    -- Partners themselves
    DELETE FROM public.partners
    WHERE id IN (SELECT id FROM temp_orphaned_partners);
    
    GET DIAGNOSTICS deleted_partners_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % orphaned partners', deleted_partners_count;
    
    -- Cleanup temp table
    DROP TABLE IF EXISTS temp_orphaned_partners;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Schedule the cron job (Weekly: Sunday at 03:00 AM)
-- Only attempt to schedule if pg_cron is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule if exists to avoid duplicates/updates
        -- We check first to avoid "could not find valid entry" error
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-db-cleanup') THEN
             PERFORM cron.unschedule('weekly-db-cleanup');
        END IF;
        
        PERFORM cron.schedule(
            'weekly-db-cleanup',
            '0 3 * * 0', -- 03:00 on Sunday
            'SELECT public.cleanup_database()'
        );
    END IF;
END $$;
