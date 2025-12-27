-- Migration: Ensure Offers are viewable by Public and Bookings by Users
-- Created at: 2025-12-27T14:40:00.000Z

-- Ensure Offers are publicly viewable
-- Check if policy exists, if not create.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'offers' 
        AND policyname = 'Public offers are viewable by everyone.'
    ) THEN
        CREATE POLICY "Public offers are viewable by everyone." 
        ON offers FOR SELECT 
        USING ( true );
    END IF;

    -- Ensure Bookings are viewable by Users (re-applying/verifying)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Users can view their own bookings'
    ) THEN
        CREATE POLICY "Users can view their own bookings" 
        ON bookings FOR SELECT 
        USING ( user_id = auth.uid() );
    END IF;
END $$;
