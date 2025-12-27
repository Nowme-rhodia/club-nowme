-- Migration: Add RLS policies for partner bookings access
-- Created at: 2025-12-27T13:10:00.000Z

-- Enable RLS on bookings if not already enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy for Partners to view bookings for their offers (via partner_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Partners can view their own bookings'
    ) THEN
        CREATE POLICY "Partners can view their own bookings" 
        ON bookings FOR SELECT 
        USING (
            partner_id IN (
                SELECT partner_id FROM user_profiles WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;
