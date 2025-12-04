# Debug: Problème de chargement du profil utilisateur

## Symptômes observés

Les logs montrent que `loadUserProfile` est appelé mais ne retourne jamais les données :
- ✅ Log présent : `🔍 loadUserProfile - Starting for userId: d1b1bf86-3726-4707-a3f1-1727e5807e04`
- ❌ Log manquant : `🔍 loadUserProfile - About to query partners table...`
- ❌ Log manquant : `🔍 loadUserProfile - Partner data received:`
- ❌ Log manquant : `🔍 loadUserProfile - User profile data received:`

**Conclusion : Les requêtes Supabase ne se terminent jamais ou sont bloquées.**

## Causes possibles

### 1. Problème de RLS (Row Level Security)
Les politiques RLS de Supabase peuvent bloquer l'accès aux tables `user_profiles` et `partners`.

**Vérification à faire :**
```sql
-- Vérifier les politiques RLS sur user_profiles
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Vérifier les politiques RLS sur partners
SELECT * FROM pg_policies WHERE tablename = 'partners';

-- Vérifier si le profil existe
SELECT * FROM user_profiles WHERE user_id = 'd1b1bf86-3726-4707-a3f1-1727e5807e04';

-- Vérifier si l'abonnement existe
SELECT * FROM subscriptions WHERE user_id = 'd1b1bf86-3726-4707-a3f1-1727e5807e04';
```

### 2. Profil non créé lors de l'inscription
La fonction Edge `link-auth-to-profile` peut ne pas avoir créé le profil.

**Vérification à faire :**
- Vérifier les logs de la fonction Edge `link-auth-to-profile` dans Supabase Dashboard
- Vérifier si le profil existe dans la table `user_profiles`

### 3. Timeout ou erreur réseau
Les requêtes Supabase peuvent timeout ou échouer silencieusement.

## Solutions à tester

### Solution 1 : Vérifier et corriger les politiques RLS

Les politiques RLS doivent permettre à un utilisateur authentifié de lire son propre profil :

```sql
-- Pour user_profiles
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Pour partners
CREATE POLICY "Partners can read own data"
ON partners FOR SELECT
USING (auth.uid() = user_id);
```

### Solution 2 : Ajouter un timeout aux requêtes

Modifier `loadUserProfile` pour ajouter un timeout :

```typescript
const loadUserProfileWithTimeout = async (userId: string, timeout: number = 5000) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Query timeout')), timeout)
  );
  
  const queryPromise = loadUserProfile(userId);
  
  return Promise.race([queryPromise, timeoutPromise]);
};
```

### Solution 3 : Utiliser le Service Role Key pour le chargement initial

Si les RLS bloquent, on peut utiliser un endpoint Edge Function avec le Service Role Key :

```typescript
// Créer une fonction Edge pour récupérer le profil
const { data, error } = await supabase.functions.invoke('get-user-profile', {
  body: { userId }
});
```

### Solution 4 : Vérifier que le profil est créé avant de rediriger

Dans `SignUp.tsx`, s'assurer que le profil est bien créé :

```typescript
// Après l'appel à link-auth-to-profile
const profileData = await profileResponse.json();
console.log('✅ Profil créé:', profileData);

// Vérifier que le profil existe vraiment
const { data: verifyProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', authData.user.id)
  .single();

if (!verifyProfile) {
  throw new Error('Profil non créé dans la base de données');
}
```

## Actions immédiates

1. **Tester avec les nouveaux logs** : Relancer le flow d'inscription et voir où ça bloque exactement
2. **Vérifier la base de données** : Exécuter les requêtes SQL ci-dessus
3. **Vérifier les logs Supabase** : Dashboard > Logs > Edge Functions
4. **Tester les politiques RLS** : Dashboard > Table Editor > user_profiles > RLS

## Workaround temporaire

En attendant de résoudre le problème, on peut créer un endpoint Edge Function qui utilise le Service Role Key pour récupérer le profil :

```typescript
// supabase/functions/get-user-profile/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Bypass RLS
  )

  const { userId } = await req.json()

  const { data: userData, error: userError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .select('id,user_id,status')
    .eq('user_id', userId)
    .maybeSingle()

  return new Response(
    JSON.stringify({ userData, partnerData }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Puis dans `auth.tsx` :

```typescript
const loadUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('get-user-profile', {
      body: { userId }
    })

    if (error) throw error

    const { userData, partnerData } = data
    // ... reste du code
  } catch (e) {
    console.error('❌ loadUserProfile error:', e)
  }
}
```
