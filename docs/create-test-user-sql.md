# Créer un utilisateur test via SQL

## 🔧 **MÉTHODE QUI FONCTIONNE :**

### Étape 1 : Utiliser la fonction qui fonctionne
**Supabase Dashboard** → **SQL Editor** → **New query**

```sql
-- Créer un utilisateur test premium avec la fonction qui marche
SELECT create_working_test_user(
  'test-nouveau@nowme.fr',
  'motdepasse123',
  'Sophie',
  'Test',
  '+33612345678',
  'premium'
);
```

### Étape 2 : Créer un utilisateur discovery
```sql
-- Créer un utilisateur test discovery
SELECT create_working_test_user(
  'test-discovery@nowme.fr',
  'motdepasse123',
  'Marie',
  'Discovery',
  '+33612345679',
  'discovery'
);
```

### Étape 3 : Méthode manuelle (si la fonction ne marche pas)
```sql
-- Votre code qui fonctionne :
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  -- Generate UUID for the new user
  user_uuid := gen_random_uuid();

  -- Insert into auth.users table
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    'test-manual@nowme.fr',
    crypt('motdepasse123', gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, 'test-manual@nowme.fr', 'Test', 'Manual',
    '+33612345680', 'active', 'premium', now(), now()
  )
  RETURNING id INTO profile_id;

  -- Insert into member_rewards
  INSERT INTO public.member_rewards (
    user_id, points_earned, points_spent, points_balance, tier_level
  ) VALUES (
    profile_id, 0, 0, 0, 'bronze'
  );

  RAISE NOTICE 'User created with ID: %', user_uuid;
  RAISE NOTICE 'Profile created with ID: %', profile_id;
END;
$$;
```

## 🎯 **LA FONCTION GÈRE MAINTENANT :**

- ✅ **Création auth.users** : Avec mot de passe crypté
- ✅ **Création user_profiles** : Avec toutes les colonnes
- ✅ **Création member_rewards** : Automatique
- ✅ **Gestion des erreurs** : Messages clairs
- ✅ **UUID uniques** : Générés correctement

## 🔍 **SI VOUS AVEZ ENCORE DES ERREURS :**

### Vérifiez les politiques existantes :
```sql
-- Voir toutes les politiques sur user_profiles
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'user_profiles';

-- Voir toutes les politiques sur member_rewards  
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'member_rewards';
```

## 🔧 **MÉTHODE ALTERNATIVE : Si la fonction ne marche pas**

Utilisez la méthode manuelle ci-dessus (Étape 3) qui fonctionne à 100% !

## 🎯 **APRÈS CRÉATION :**

### Testez la connexion :
```
URL: /auth/signin
Email: test-auto@nowme.fr (ou l'email que vous avez utilisé)
Password: motdepasse123
```

### Vérifiez le profil :
```
URL: /account
```

## 🔍 **VÉRIFIER LES UTILISATEURS CRÉÉS :**

```sql
-- Voir tous les utilisateurs auth
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Voir tous les profils
SELECT user_id, email, first_name, subscription_type FROM user_profiles ORDER BY created_at DESC;
```

## 🚨 **SI ÇA NE MARCHE TOUJOURS PAS :**

```sql
-- Désactiver temporairement RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- Créer l'utilisateur manuellement
-- Puis réactiver
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

## 🎯 **AVANTAGES DE LA NOUVELLE MÉTHODE :**

- ✅ **Code testé et validé** par vous
- ✅ **Création complète** auth + profil + récompenses
- ✅ **UUID corrects** et relations valides
- ✅ **Fonctionne à 100%** dans votre environnement