-- Bulk Cancel Pending Emails
-- This ensures that old emails stuck in the queue will NOT be sent when the quota returns.

UPDATE public.emails
SET status = 'cancelled', -- or 'failed' if you prefer
    error_log = 'Cancelled by admin to prevent quota spam'
WHERE status = 'pending' OR status = 'retrying';

-- Verify the cleanup
SELECT count(*) as cancelled_emails FROM public.emails WHERE status = 'cancelled';
