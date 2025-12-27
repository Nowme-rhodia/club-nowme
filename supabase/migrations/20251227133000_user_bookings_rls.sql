-- Migration: Add RLS policies for user bookings access
-- Created at: 2025-12-27T13:30:00.000Z

-- Policy for Users (subscribers/normals) to view their OWN bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Users can view their own bookings'
    ) THEN
        CREATE POLICY "Users can view their own bookings" 
        ON bookings FOR SELECT 
        USING (
            user_id = auth.uid()
        );
    END IF;
END $$;
