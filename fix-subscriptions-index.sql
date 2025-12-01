-- Ajouter la contrainte UNIQUE sur stripe_subscription_id
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_stripe_subscription_id_unique 
UNIQUE (stripe_subscription_id);

-- Vérifier que la contrainte a été créée
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass
AND conname LIKE '%stripe%';
