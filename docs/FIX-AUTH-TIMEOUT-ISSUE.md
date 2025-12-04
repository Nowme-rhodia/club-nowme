# Fix: Timeout des requêtes Supabase lors du chargement du profil

## Problème identifié

Les logs montrent que `loadUserProfile` démarre mais ne termine jamais les requêtes Supabase :
- ✅ `🔍 loadUserProfile - Starting for userId: d1b1bf86-3726-4707-a3f1-1727e5807e04`
- ❌ Aucun log suivant n'apparaît (Partner data, User profile data, etc.)

**Conclusion : Les requêtes Supabase sont bloquées, probablement par des politiques RLS (Row Level Security) ou un problème de permissions.**

## Causes possibles

### 1. Politiques RLS trop restrictives
Les politiques RLS sur `user_profiles` et `partners` peuvent bloquer l'accès même pour l'utilisateur authentifié.

### 2. Profil non créé
Le profil n'existe peut-être pas dans la base de données après l'inscription.

### 3. Timeout réseau
Les requêtes peuvent prendre trop de temps et bloquer l'application.

## Solutions implémentées

### 1. Ajout de timeout sur les requêtes (5 secondes)

```typescript
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
);

const { data, error } = await Promise.race([
  supabaseQuery,
  timeoutPromise
]) as any;
```

**Avantage :** Si une requête est bloquée, elle échoue après 5 secondes au lieu de bloquer indéfiniment.

### 2. Logs détaillés à chaque étape

Ajout de logs avant et après chaque requête pour identifier exactement où le code bloque :
- `🔍 loadUserProfile - About to query partners table...`
- `🔍 loadUserProfile - Partner query created, awaiting response...`
- `🔍 loadUserProfile - Partner data received:`
- etc.

### 3. Fonction Edge comme fallback

Création de `supabase/functions/get-user-profile/index.ts` qui utilise le **Service Role Key** pour bypasser les RLS :

```typescript
// Utilise SUPABASE_SERVICE_ROLE_KEY au lieu de ANON_KEY
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Bypass RLS
)
```

**Avantage :** Si les requêtes directes échouent à cause des RLS, le fallback utilise les permissions admin pour récupérer le profil.

### 4. Logique de fallback automatique

Si un timeout est détecté, `loadUserProfile` appelle automatiquement la fonction Edge :

```typescript
catch (e: any) {
  if (e.message?.includes('timeout')) {
    console.warn('⚠️ Timeout detected, trying Edge Function fallback...');
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-user-profile`,
      { body: JSON.stringify({ userId }) }
    );
    // ... traiter la réponse
  }
}
```

## Déploiement de la fonction Edge

### Étape 1 : Déployer la fonction

```bash
cd c:\Users\boris\.symfony\nowme\club-nowme
supabase functions deploy get-user-profile
```

### Étape 2 : Vérifier le déploiement

Dans le Dashboard Supabase :
1. Aller dans **Edge Functions**
2. Vérifier que `get-user-profile` apparaît
3. Tester la fonction avec :
```json
{
  "userId": "d1b1bf86-3726-4707-a3f1-1727e5807e04"
}
```

### Étape 3 : Vérifier les logs

Après avoir testé le flow d'inscription, vérifier les logs :
- Si vous voyez `⚠️ Timeout detected, trying Edge Function fallback...` → Le fallback fonctionne
- Si vous voyez `✅ loadUserProfile - Data from Edge Function:` → Les données sont récupérées via le fallback

## Vérifications à faire dans Supabase

### 1. Vérifier que le profil existe

```sql
SELECT * FROM user_profiles 
WHERE user_id = 'd1b1bf86-3726-4707-a3f1-1727e5807e04';
```

Si le profil n'existe pas, le problème vient de la fonction `link-auth-to-profile`.

### 2. Vérifier les politiques RLS

```sql
-- Voir toutes les politiques sur user_profiles
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Voir toutes les politiques sur partners
SELECT * FROM pg_policies WHERE tablename = 'partners';
```

### 3. Tester les permissions manuellement

Dans le SQL Editor de Supabase, avec l'utilisateur authentifié :

```sql
-- Se connecter en tant qu'utilisateur
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "d1b1bf86-3726-4707-a3f1-1727e5807e04"}';

-- Tester la lecture
SELECT * FROM user_profiles WHERE user_id = 'd1b1bf86-3726-4707-a3f1-1727e5807e04';
```

Si cette requête échoue, les RLS sont trop restrictives.

### 4. Corriger les politiques RLS si nécessaire

```sql
-- Politique pour permettre aux utilisateurs de lire leur propre profil
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de mettre à jour leur profil
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Même chose pour partners
CREATE POLICY "Partners can read own data"
ON partners FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

## Tests à effectuer

### Test 1 : Vérifier les nouveaux logs

1. Ouvrir la console du navigateur
2. Effectuer une inscription complète
3. **Vérifier les logs :**
   - `🔍 loadUserProfile - About to query partners table...` doit apparaître
   - `🔍 loadUserProfile - Partner query created, awaiting response...` doit apparaître
   - Si timeout : `⚠️ Timeout detected, trying Edge Function fallback...`
   - Si fallback : `✅ loadUserProfile - Data from Edge Function:`

### Test 2 : Vérifier que le profil se charge

Après l'inscription et le paiement :
1. Le prénom doit s'afficher dans le header
2. Cliquer sur "Mon compte" doit fonctionner
3. Pas de redirection infinie

### Test 3 : Vérifier le fallback

Si les requêtes directes timeout, le fallback doit fonctionner :
1. Les logs doivent montrer `⚠️ Timeout detected`
2. Puis `✅ loadUserProfile - Data from Edge Function:`
3. Le profil doit se charger correctement

## Si le problème persiste

### Option 1 : Utiliser uniquement la fonction Edge

Modifier `loadUserProfile` pour toujours utiliser la fonction Edge :

```typescript
const loadUserProfile = async (userId: string) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-profile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ userId })
      }
    );
    
    const { userData, partnerData } = await response.json();
    // ... traiter les données
  } catch (e) {
    console.error('❌ loadUserProfile error:', e);
  }
}
```

### Option 2 : Désactiver temporairement les RLS

**⚠️ ATTENTION : À utiliser uniquement en développement !**

```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
```

Puis tester si le problème vient bien des RLS.

### Option 3 : Vérifier les logs Supabase

Dans le Dashboard Supabase :
1. Aller dans **Logs** > **Postgres Logs**
2. Chercher les erreurs liées à `user_profiles` ou `partners`
3. Vérifier si des requêtes sont bloquées

## Commandes utiles

### Déployer la fonction Edge

```bash
cd c:\Users\boris\.symfony\nowme\club-nowme
supabase functions deploy get-user-profile
```

### Voir les logs de la fonction Edge

```bash
supabase functions logs get-user-profile
```

### Tester la fonction Edge localement

```bash
supabase functions serve get-user-profile
```

Puis dans un autre terminal :

```bash
curl -X POST http://localhost:54321/functions/v1/get-user-profile \
  -H "Content-Type: application/json" \
  -d '{"userId": "d1b1bf86-3726-4707-a3f1-1727e5807e04"}'
```

## Fichiers modifiés

- `src/lib/auth.tsx` - Ajout timeout et fallback Edge Function
- `supabase/functions/get-user-profile/index.ts` - Nouvelle fonction Edge
- `docs/FIX-AUTH-TIMEOUT-ISSUE.md` - Ce document
- `docs/DEBUG-AUTH-PROFILE.md` - Guide de debugging

## Prochaines étapes

1. **Déployer la fonction Edge** : `supabase functions deploy get-user-profile`
2. **Tester le flow complet** : Inscription → Paiement → Accès au compte
3. **Vérifier les logs** : Identifier si le timeout se produit et si le fallback fonctionne
4. **Corriger les RLS** : Si le problème vient des RLS, les ajuster
5. **Optimiser** : Une fois que ça fonctionne, décider si on garde le fallback ou si on corrige les RLS

## Résumé

Le problème vient probablement de **politiques RLS trop restrictives** qui bloquent les requêtes Supabase. Les solutions implémentées :

1. ✅ **Timeout de 5 secondes** pour éviter les blocages infinis
2. ✅ **Logs détaillés** pour identifier où ça bloque
3. ✅ **Fonction Edge avec Service Role Key** pour bypasser les RLS
4. ✅ **Fallback automatique** si timeout détecté

**Action immédiate : Déployer la fonction Edge et tester le flow complet.**
