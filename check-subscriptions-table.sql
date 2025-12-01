-- Vérifier la structure de la table subscriptions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Vérifier les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions';

-- Vérifier les contraintes
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass;
