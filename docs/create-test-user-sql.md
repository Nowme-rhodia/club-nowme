# Créer un utilisateur test via SQL

## 🔧 **MÉTHODE 1 : Via SQL Editor dans Supabase**

### Étape 1 : Aller dans SQL Editor
**Supabase Dashboard** → **SQL Editor** → **New query**

### Étape 2 : Créer l'utilisateur directement dans auth.users
```sql
-- 1. Créer l'utilisateur auth directement
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  email_change_confirm_status,
  banned_until,
  confirmation_sent_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-simple@nowme.fr',
  crypt('motdepasse123', gen_salt('bf')),
  now(),
  0,
  null,
  now(),
  now(),
  now(),
  '{}',
  '{}',
  false,
  now()
);
```

-- 1. Récupérer l'ID de l'utilisateur créé
SELECT id, email FROM auth.users WHERE email = 'test-simple@nowme.fr';

-- 2. Créer le profil (remplacez USER_ID_ICI par l'ID récupéré)
INSERT INTO public.user_profiles (
  user_id,
  email,
  first_name,
  last_name,
  phone,
  subscription_status,
  subscription_type
) VALUES (
  'USER_ID_ICI',
  'test-simple@nowme.fr',
  'Sophie',
  'Test',
  '+33612345678',
  'active',
  'premium'
);
```

## 🔧 **MÉTHODE 2 : Alternative plus simple**

```sql
-- Méthode alternative : insertion directe simplifiée
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Générer un UUID
    user_uuid := gen_random_uuid();
    
    -- Insérer dans auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, created_at, updated_at, raw_app_meta_data, 
        raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_uuid,
        'authenticated',
        'authenticated', 
        'test-simple@nowme.fr',
        crypt('motdepasse123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{}',
        '{}',
        false
    );
    
    -- Insérer dans user_profiles
    INSERT INTO public.user_profiles (
        user_id, email, first_name, last_name, phone,
        subscription_status, subscription_type
    ) VALUES (
        user_uuid,
        'test-simple@nowme.fr',
        'Sophie',
        'Test', 
        '+33612345678',
        'active',
        'premium'
    );
    
    RAISE NOTICE 'Utilisateur créé avec ID: %', user_uuid;
END $$;
```

## 🎯 **APRÈS CRÉATION :**

### Testez la connexion :
```
URL: /auth/signin
Email: test-simple@nowme.fr
Password: motdepasse123
```

### Vérifiez le profil :
```
URL: /account
```

## 🚨 **SI ÇA NE MARCHE TOUJOURS PAS :**

Le problème vient probablement de la configuration RLS (Row Level Security). 

### Désactiver temporairement RLS :
```sql
-- Désactiver RLS sur user_profiles pour les tests
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
```

### Réactiver après les tests :
```sql
-- Réactiver RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
```

## 🔍 **VÉRIFIER LES POLITIQUES RLS :**

```sql
-- Voir les politiques actuelles
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

Essayez d'abord la **MÉTHODE 2** (fonction admin) car elle est plus simple ! 🚀