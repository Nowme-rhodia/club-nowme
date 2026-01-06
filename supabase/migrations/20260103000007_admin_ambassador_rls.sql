-- Allow Admins to View and Update Ambassador Applications
-- Using the email check for simplicity as seen in other policies, or user_profiles.is_admin if reliable.
-- Let's use the explicit email check for 'rhodia@nowme.fr' to be safe and consistent with previous patterns if is_admin isn't fully set up on auth.

DROP POLICY IF EXISTS "Admins can view all applications" ON ambassador_applications;
create policy "Admins can view all applications"
on ambassador_applications for select
to authenticated
using (
    (select is_admin from user_profiles where user_id = auth.uid()) = true
    or auth.jwt() ->> 'email' = 'rhodia@nowme.fr'
);

DROP POLICY IF EXISTS "Admins can update applications" ON ambassador_applications;
create policy "Admins can update applications"
on ambassador_applications for update
to authenticated
using (
    (select is_admin from user_profiles where user_id = auth.uid()) = true
    or auth.jwt() ->> 'email' = 'rhodia@nowme.fr'
);
