-- Allow partners to view user profiles of people who have booked them
-- This is necessary for the bookings table to display client contact info

CREATE POLICY "Partners can view profiles of their bookings"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.user_id = user_profiles.user_id
    AND bookings.partner_id = (
      SELECT partner_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);
