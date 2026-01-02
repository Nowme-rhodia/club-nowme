-- Stop the 5-minute email loop by unscheduling the cron job
-- Job Name: send_emails_job

DO $$
BEGIN
    PERFORM cron.unschedule('send_emails_job');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error unscheduling send_emails_job: %', SQLERRM;
END $$;

-- Optional: If you want to delete it completely to be sure
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send_emails_job'; 
