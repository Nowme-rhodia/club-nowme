
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('partners', 'user_profiles')
ORDER BY table_name, column_name;
