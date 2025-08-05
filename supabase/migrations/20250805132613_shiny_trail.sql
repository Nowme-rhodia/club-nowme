-- 2. CONTRAINTES DE CLÉ ÉTRANGÈRE
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
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. VÉRIFIER SI LA TABLE USERS EXISTE
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name IN ('users', 'user_profiles')
  AND table_schema = 'public';

-- 4. VÉRIFIER LA TABLE AUTH.USERS
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'users'
  AND table_schema = 'auth';

-- 5. COMPTER LES ENREGISTREMENTS
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users;

-- 6. VÉRIFIER LES DONNÉES ORPHELINES
SELECT 
  up.id,
  up.user_id,
  up.email,
  CASE 
    WHEN au.id IS NULL THEN 'ORPHAN - No auth user'
    ELSE 'OK'
  END as status
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
LIMIT 10;

-- 7. VÉRIFIER LES POLITIQUES RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles';