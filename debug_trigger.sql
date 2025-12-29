-- Check trigger definition
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'partners';

-- Check the function code calling the Edge Function
SELECT prosrc FROM pg_proc WHERE proname = 'handle_partner_approval';
