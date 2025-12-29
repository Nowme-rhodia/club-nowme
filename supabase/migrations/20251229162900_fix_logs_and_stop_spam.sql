-- 1. Create the missing 'email_logs' table to fix the trigger error
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Bulk update pending emails to 'failed' (valid status) to clear the queue
-- Using 'failed' instead of 'cancelled' because of check constraints
UPDATE public.emails
SET status = 'failed',
    error_log = 'Cancelled by system: Quota exceeded cleanup'
WHERE status = 'pending';

-- 3. Verify the result
SELECT status, count(*) FROM public.emails GROUP BY status;
