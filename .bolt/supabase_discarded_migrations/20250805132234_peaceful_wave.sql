-- Diagnostic complet de la table user_profiles et ses contraintes

-- 1. Voir la structure de la table user_profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Voir toutes les contraintes de clé étrangère sur user_profiles
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'user_profiles' 
AND tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Vérifier spécifiquement la contrainte fk_user_profiles_user
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conname = 'fk_user_profiles_user';

-- 4. Voir si la table 'users' existe (celle référencée par la FK)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
) as users_table_exists;

-- 5. Si la table users existe, voir sa structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Voir les données dans auth.users (les 5 derniers)
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Voir les données dans user_profiles (les 5 derniers)
SELECT 
    id,
    user_id,
    email,
    subscription_status,
    subscription_type,
    created_at
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Vérifier s'il y a des user_profiles orphelins (sans user_id valide)
SELECT 
    up.id,
    up.user_id,
    up.email,
    CASE 
        WHEN au.id IS NULL THEN 'ORPHELIN - user_id inexistant dans auth.users'
        ELSE 'OK'
    END as status
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE au.id IS NULL
LIMIT 10;