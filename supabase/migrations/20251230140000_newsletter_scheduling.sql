-- Create table for storing newsletters
CREATE TABLE IF NOT EXISTS public.admin_newsletters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'processing', 'sent', 'failed'
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    target_filter JSONB DEFAULT '{}'::jsonb -- For future use (segmentation)
);

-- RLS Policies
ALTER TABLE public.admin_newsletters ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage newsletters" ON public.admin_newsletters;
CREATE POLICY "Admins can manage newsletters" ON public.admin_newsletters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Schedule the Cron Job to process newsletters every 30 minutes
-- (Cron syntax: min hour day month day_of_week)
-- "*/30 * * * *" means every 30 minutes
DO $block$
BEGIN
    PERFORM cron.unschedule('process-newsletters');
    PERFORM cron.schedule(
        'process-newsletters',
        '*/30 * * * *',
        $$
        SELECT
          net.http_post(
            url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/process-scheduled-newsletters',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
          ) as request_id;
        $$
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling process-newsletters: %', SQLERRM;
END $block$;
