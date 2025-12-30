-- COMPREHENSIVE DEBUG (FIXED)
-- Removed non-existent 'role' column.
-- Checks 'is_admin' and 'partner_id' specifically.

SELECT 
    u.id, 
    u.email, 
    u.is_admin, 
    u.partner_id, 
    u.selected_plan, 
    u.created_at, 
    u.reminder_step, 
    u.last_reminder_sent_at,
    s.status as subscription_status,
    s.current_period_end
FROM user_profiles u
LEFT JOIN subscriptions s ON u.user_id = s.user_id
WHERE u.email = 'qlesc.podcast@gmail.com';
