
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners' AND column_name = 'commission_rate';
