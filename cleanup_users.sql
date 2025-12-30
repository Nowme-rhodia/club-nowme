-- CLEANUP SCRIPT
-- WARNING: This will delete users and all their related data (profiles, bookings, partners, offers...).

-- 1. Create a temporary table for the whitelist to avoid repetition
CREATE TEMP TABLE whitelist_emails (email text);
INSERT INTO whitelist_emails (email) VALUES 
  ('admin@admin.com'),
  ('boris.kwemo@gmail.com'),
  ('entreprisepartenaire@gmail.com'),
  ('test_client@nowme.io'),
  ('testiroso@testiroso.com'),
  ('rhodia.kw@gmail.com'),
  ('rhodia.partner@nowme.fr'),
  ('nowme.club@gmail.com'),
  ('thewoooclub@gmail.com'),
  ('rhodia@nowme.fr'),
  ('contact@nowme.fr');

-- 2. Delete from public tables that might not cascade correctly or to be safe
-- (Optional: cleanup email_logs if they are not linked to users via FK)
TRUNCATE TABLE public.email_logs;

-- 3. Delete from auth.users (This should CASCADE to user_profiles, partners, etc.)
DELETE FROM auth.users
WHERE email NOT IN (SELECT email FROM whitelist_emails);

-- 4. Cleanup orphan data in public tables if any (safety check)
-- Partners (should be gone via cascade, but just in case)
DELETE FROM public.partners 
WHERE user_id IS NOT NULL 
AND user_id NOT IN (SELECT id FROM auth.users);

-- Offers (linked to partners)
DELETE FROM public.offers 
WHERE partner_id NOT IN (SELECT id FROM public.partners);

-- Bookings (linked to users)
DELETE FROM public.bookings
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- User Profiles
DELETE FROM public.user_profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Drop temp table
DROP TABLE whitelist_emails;
