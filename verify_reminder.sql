-- VERIFICATION SCRIPT FOR REMINDERS
BEGIN;

-- 1. Setup Test Data
-- Partner created 5.5 days ago (Should receive reminder)
INSERT INTO public.partners (id, business_name, contact_email, status, created_at, reminder_sent)
VALUES ('00000000-0000-0000-0000-000000000003', 'Reminder Target', 'test-reminder@example.com', 'pending', now() - interval '5 days' - interval '12 hours', FALSE);

-- Partner created 2 days ago (Should NOT receive reminder)
INSERT INTO public.partners (id, business_name, contact_email, status, created_at, reminder_sent)
VALUES ('00000000-0000-0000-0000-000000000004', 'Too New Partner', 'test-new@example.com', 'pending', now() - interval '2 days', FALSE);

-- Partner created 5.5 days ago BUT reminder already sent (Should NOT receive reminder)
INSERT INTO public.partners (id, business_name, contact_email, status, created_at, reminder_sent)
VALUES ('00000000-0000-0000-0000-000000000005', 'Already Sent Partner', 'test-sent@example.com', 'pending', now() - interval '5 days' - interval '12 hours', TRUE);


-- 2. Run Reminder Function
SELECT public.send_partner_reminders();

-- 3. Verify Results
-- Check if reminder_sent became TRUE for the target
SELECT id, business_name, reminder_sent FROM public.partners WHERE id = '00000000-0000-0000-0000-000000000003';
-- Check others (should be unchanged)
SELECT id, business_name, reminder_sent FROM public.partners WHERE id = '00000000-0000-0000-0000-000000000004';
SELECT id, business_name, reminder_sent FROM public.partners WHERE id = '00000000-0000-0000-0000-000000000005';

ROLLBACK;
