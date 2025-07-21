# Créer un utilisateur test via SQL

## 🔧 **MÉTHODE 1 : Via SQL Editor dans Supabase**

### Étape 1 : Aller dans SQL Editor
**Supabase Dashboard** → **SQL Editor** → **New query**

### Étape 2 : Exécuter cette requête
```sql
-- 1. Créer l'utilisateur auth (avec mot de passe)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-nouveau@nowme.fr',
  crypt('motdepasse123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 2. Récupérer l'ID de l'utilisateur créé
SELECT id, email FROM auth.users WHERE email = 'test-nouveau@nowme.fr';
```

### Étape 3 : Créer le profil utilisateur
```sql
-- Remplacez USER_ID_ICI par l'ID récupéré à l'étape 2
INSERT INTO public.user_profiles (
  user_id,
  email,
  first_name,
  last_name,
  phone,
  subscription_status,
  subscription_type
) VALUES (
  'USER_ID_ICI', -- Remplacez par l'ID réel
  'test-nouveau@nowme.fr',
  'Sophie',
  'Test',
  '+33612345678',
  'active',
  'premium'
);
```

## 🔧 **MÉTHODE 2 : Plus simple - Utiliser la fonction admin**

```sql
-- Créer l'utilisateur avec la fonction admin
SELECT auth.admin_create_user(
  'test-nouveau@nowme.fr',
  'motdepasse123',
  true -- email confirmé
);
```

## 🎯 **APRÈS CRÉATION :**

### Testez la connexion :
```
URL: /auth/signin
Email: test-nouveau@nowme.fr
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