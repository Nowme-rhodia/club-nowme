
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name IN ('payout_iban', 'stripe_account_id', 'calendly_url');
