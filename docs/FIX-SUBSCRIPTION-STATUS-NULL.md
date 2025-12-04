# Fix: subscription_status reste NULL après paiement

## Problème identifié

Les logs montrent que le profil est bien chargé, mais **`subscription_status` est `undefined` (NULL en base de données)** au lieu de `'active'` :

```
🔍 loadUserProfile - User profile data received: {
  id: 'a9259e6b-ba38-4b1b-9e30-2b717c5d2e20',
  user_id: '89b789aa-5533-4b1d-84a4-4ac85b00e28b',
  first_name: 'Test312',
  subscription_status: undefined  // ❌ Devrait être 'active'
}
🔍 loadUserProfile - Role derived: guest  // ❌ Devrait être 'subscriber'
```

**Conclusion : La fonction `verify-subscription` ne met pas à jour correctement le champ `subscription_status` dans `user_profiles`.**

## Causes possibles

### 1. Problème de permissions RLS
Les politiques RLS (Row Level Security) peuvent bloquer l'UPDATE même avec le Service Role Key.

### 2. Le user_id ne correspond pas
Le `user_id` dans `user_profiles` peut ne pas correspondre au `user_id` de l'auth.

### 3. L'UPDATE échoue silencieusement
L'UPDATE peut échouer sans retourner d'erreur.

## Vérifications à faire

### 1. Vérifier manuellement dans Supabase

Exécuter ce SQL dans le SQL Editor de Supabase :

```sql
-- Vérifier le profil
SELECT 
    id,
    user_id,
    email,
    first_name,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id
FROM user_profiles
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';

-- Vérifier l'abonnement
SELECT 
    id,
    user_id,
    stripe_subscription_id,
    status
FROM subscriptions
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';
```

**Résultat attendu :**
- `subscription_status` devrait être `'active'`
- Un enregistrement devrait exister dans `subscriptions` avec `status = 'active'`

**Si `subscription_status` est NULL :**
- L'UPDATE dans `verify-subscription` a échoué
- Vérifier les logs de la fonction Edge dans Supabase Dashboard

### 2. Vérifier les logs de la fonction Edge

Dans Supabase Dashboard :
1. Aller dans **Edge Functions** > **verify-subscription**
2. Cliquer sur **Logs**
3. Chercher les logs pour la session `cs_test_b1ygdk9HeEahY9s1wyHPsRUSLxkSAVXmRyMAjm25MnA2jsRMQceqXUvIvp`
4. Vérifier si ces logs apparaissent :
   - `🔄 Updating user profile with subscription_status: active`
   - `✅ User profile updated successfully`
   - `✅ Updated profile data:`

**Si les logs montrent une erreur :**
- Copier l'erreur complète
- Vérifier les politiques RLS sur `user_profiles`

### 3. Vérifier les politiques RLS

```sql
-- Voir toutes les politiques sur user_profiles
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

**Politiques nécessaires :**
```sql
-- Permettre au Service Role de tout faire (bypass RLS)
-- Ceci est automatique avec le Service Role Key

-- OU créer une politique spécifique pour l'UPDATE
CREATE POLICY "Service role can update profiles"
ON user_profiles FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
```

## Solutions

### Solution 1 : Corriger manuellement en SQL (temporaire)

Si vous devez débloquer l'utilisateur immédiatement :

```sql
UPDATE user_profiles
SET 
    subscription_status = 'active',
    updated_at = NOW()
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b'
RETURNING *;
```

Puis rafraîchir la page dans le navigateur.

### Solution 2 : Vérifier que l'UPDATE utilise bien le Service Role Key

Dans `verify-subscription/index.ts`, vérifier que le client Supabase utilise le Service Role Key :

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // ✅ Doit être SERVICE_ROLE_KEY
);
```

### Solution 3 : Ajouter un retry si l'UPDATE échoue

Modifier `verify-subscription/index.ts` pour réessayer l'UPDATE :

```typescript
// 9. Update user_profiles with subscription info (avec retry)
let updateAttempts = 0;
const maxAttempts = 3;
let profileUpdateError = null;

while (updateAttempts < maxAttempts) {
  const { data: updatedProfile, error } = await supabase
    .from("user_profiles")
    .update({
      subscription_status: "active",
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userProfile.user_id)
    .select();

  if (!error) {
    console.log("✅ User profile updated successfully:", updatedProfile);
    break;
  }

  profileUpdateError = error;
  updateAttempts++;
  console.warn(`⚠️ Update attempt ${updateAttempts}/${maxAttempts} failed:`, error);
  
  if (updateAttempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

if (profileUpdateError) {
  console.error("❌ Failed to update user profile after", maxAttempts, "attempts:", profileUpdateError);
}
```

### Solution 4 : Utiliser un trigger PostgreSQL

Créer un trigger qui met automatiquement à jour `user_profiles.subscription_status` quand un abonnement est créé/mis à jour :

```sql
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET subscription_status = NEW.status
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_subscription_status_trigger
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_status();
```

## Tests à effectuer

### Test 1 : Vérifier les logs de verify-subscription

1. Faire un nouveau paiement test
2. Aller dans Supabase Dashboard > Edge Functions > verify-subscription > Logs
3. Vérifier que ces logs apparaissent :
   - `🔄 Updating user profile with subscription_status: active`
   - `📝 Update data:`
   - `✅ User profile updated successfully`
   - `✅ Updated profile data:`

### Test 2 : Vérifier en base de données

Après le paiement, exécuter immédiatement :

```sql
SELECT subscription_status, updated_at
FROM user_profiles
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';
```

**Résultat attendu :** `subscription_status = 'active'`

### Test 3 : Tester le flow complet

1. Nouvelle inscription
2. Paiement
3. Vérifier dans les logs du navigateur :
   ```
   🔍 loadUserProfile - Role derived: subscriber  // ✅ Devrait être 'subscriber'
   ```
4. Vérifier que l'accès à `/account` fonctionne

## Action immédiate

**Étape 1 : Vérifier manuellement en SQL**

Exécuter dans Supabase SQL Editor :

```sql
SELECT 
    user_id,
    email,
    first_name,
    subscription_status,
    stripe_subscription_id
FROM user_profiles
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';
```

**Si `subscription_status` est NULL :**

```sql
-- Corriger manuellement
UPDATE user_profiles
SET subscription_status = 'active'
WHERE user_id = '89b789aa-5533-4b1d-84a4-4ac85b00e28b';
```

**Étape 2 : Redéployer verify-subscription**

```bash
cd c:\Users\boris\.symfony\nowme\club-nowme
supabase functions deploy verify-subscription
```

**Étape 3 : Faire un nouveau test**

1. Nouvelle inscription avec un nouvel email
2. Paiement
3. Vérifier les logs de verify-subscription dans Supabase
4. Vérifier que `subscription_status = 'active'` en SQL

## Résumé

Le problème n'est PAS dans le chargement du profil (qui fonctionne correctement), mais dans la **mise à jour du champ `subscription_status`** par la fonction `verify-subscription`.

**Actions :**
1. ✅ Ajouter des logs détaillés dans `verify-subscription` (fait)
2. ⏳ Redéployer la fonction
3. ⏳ Vérifier les logs après un nouveau paiement
4. ⏳ Corriger les politiques RLS si nécessaire
5. ⏳ Ajouter un trigger PostgreSQL comme solution robuste

**Note :** Pas besoin de déployer `get-user-profile` pour l'instant, ce n'est qu'un fallback en cas de timeout.
