-- Migration: Fix RLS for Bookings/Offers and Restore Admin RPC
-- Created at: 2025-12-27T15:00:00.000Z

-- 1. Restore 'exec_sql' RPC if missing (needed for admin scripts)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_query;
END;
$$;

-- 2. Ensure RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- 3. BOOKINGS POLICIES

-- Users can view their own bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view their own bookings" 
ON bookings FOR SELECT 
USING ( user_id = auth.uid() );

-- Partners can view bookings for their offers
DROP POLICY IF EXISTS "Partners can view their own bookings" ON bookings;
CREATE POLICY "Partners can view their own bookings" 
ON bookings FOR SELECT 
USING (
    partner_id IN (
        SELECT partner_id FROM user_profiles WHERE user_id = auth.uid()
    )
);

-- 4. OFFERS POLICIES

-- Public can view ALL approved/active offers (Simplifying for debugging)
-- We drop specific policies to replace with a broad one for read access
DROP POLICY IF EXISTS "Public can view active offers" ON offers;
DROP POLICY IF EXISTS "Everyone can view active offers" ON offers;
DROP POLICY IF EXISTS "Everyone can view approved offers" ON offers;

DROP POLICY IF EXISTS "Public can view all offers" ON offers;
CREATE POLICY "Public can view all offers"
ON offers FOR SELECT
USING ( true ); 

-- Partners can view/edit their own offers (for Dashboard)
DROP POLICY IF EXISTS "Partners can view own offers" ON offers;
CREATE POLICY "Partners can view own offers"
ON offers FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE partner_id = offers.partner_id
  )
);
