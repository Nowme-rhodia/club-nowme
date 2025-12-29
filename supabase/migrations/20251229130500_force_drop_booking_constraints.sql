-- Migration: Force remove unique constraints on bookings (user_id, offer_id)
-- Created at: 2025-12-29T13:05:00.000Z

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop the specific constraint if it exists by name
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_offer_id_key') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_offer_id_key;
        RAISE NOTICE 'Dropped constraint bookings_user_id_offer_id_key';
    END IF;

    -- 2. Find and drop ANY unique index on matching columns (user_id, offer_id)
    -- This handles auto-generated names or differently named indexes
    FOR r IN (
        SELECT i.relname as index_name
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_attribute a
        WHERE t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relname = 'bookings'
          AND ix.indisunique = true
          AND a.attname IN ('user_id', 'offer_id')
        GROUP BY i.relname, ix.indkey
        HAVING array_agg(a.attname::text ORDER BY a.attname) = ARRAY['offer_id', 'user_id']
            OR array_agg(a.attname::text ORDER BY a.attname) = ARRAY['user_id', 'offer_id']
    ) LOOP
        -- Execute dynamic SQL to drop the index
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.index_name);
        RAISE NOTICE 'Dropped unique index %', r.index_name;
    END LOOP;

END $$;
