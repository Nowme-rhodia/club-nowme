-- Stop the 5-minute email loop by unscheduling the cron job
-- Job Name: send_emails_job

SELECT cron.unschedule('send_emails_job');

-- Optional: If you want to delete it completely to be sure
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send_emails_job'; 
