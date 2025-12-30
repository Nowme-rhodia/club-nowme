-- Check specific run details for the process-newsletters job (Job ID 13 or by name)
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-newsletters')
ORDER BY start_time DESC
LIMIT 10;
