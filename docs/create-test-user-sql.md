# Créer un utilisateur test via SQL

## 🔧 **MÉTHODE MISE À JOUR :**

### Étape 1 : Exécuter la migration corrigée
**Supabase Dashboard** → **SQL Editor** → Copier le fichier `20250721143530_restless_pebble.sql`

### Étape 2 : Utiliser la fonction helper
**Supabase Dashboard** → **SQL Editor** → **New query**

```sql
-- Créer un utilisateur test premium
SELECT create_test_user(
  'test-nouveau@nowme.fr',
  'motdepasse123',
  'Sophie',
  'Test',
  '+33612345678',
  'premium'
);
```

### Étape 3 : Créer un utilisateur discovery
```sql
-- Créer un utilisateur test discovery
SELECT create_test_user(
  'test-discovery@nowme.fr',
  'motdepasse123',
  'Marie',
  'Discovery',
  '+33612345679',
  'discovery'
);
```

## 🎯 **LA FONCTION GÈRE MAINTENANT :**

- ✅ **Utilisateurs existants** : Met à jour le profil au lieu de créer
- ✅ **Profils existants** : Met à jour les informations
- ✅ **Récompenses manquantes** : Les crée automatiquement
- ✅ **Pas d'erreurs de doublons** : Vérifie avant de créer

## 🔍 **SI VOUS AVEZ ENCORE DES ERREURS :**

### Vérifiez les politiques existantes :
```sql
-- Voir toutes les politiques sur user_profiles
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'user_profiles';

-- Voir toutes les politiques sur member_rewards  
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'member_rewards';
```

## 🔧 **MÉTHODE ALTERNATIVE : Si la fonction ne marche pas**

```sql
-- Temporairement désactiver RLS pour créer l'utilisateur
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Créer l'utilisateur manuellement
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    user_uuid := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, 
        raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_uuid, 'authenticated', 'authenticated',
        'test-simple@nowme.fr',
        crypt('motdepasse123', gen_salt('bf')),
        now(), now(), now(), '{}', '{}', false
    );
    
    INSERT INTO public.user_profiles (
        user_id, email, first_name, last_name, phone,
        subscription_status, subscription_type
    ) VALUES (
        user_uuid, 'test-simple@nowme.fr', 'Sophie', 'Test', 
        '+33612345678', 'active', 'premium'
    );
    
    RAISE NOTICE 'Utilisateur créé avec ID: %', user_uuid;
END $$;

-- Réactiver RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
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

- ✅ **Fonction helper** qui gère tout automatiquement
- ✅ **Permissions correctes** pour service_role
- ✅ **Création en une seule commande**
- ✅ **Support discovery et premium**