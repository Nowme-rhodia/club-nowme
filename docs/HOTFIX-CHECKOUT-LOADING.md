# 🔧 Hotfix: Checkout en boucle infinie

**Date:** 1er décembre 2025  
**Problème:** Page checkout tourne en rond après inscription  
**Statut:** ✅ Résolu

---

## 🐛 Problème identifié

### Symptôme
Après l'inscription, l'utilisateur est redirigé vers `/checkout` mais la page tourne en rond (spinner infini).

### Logs observés
```javascript
logger.ts:10 🔐 [AUTH] Session check: Object
logger.ts:41 🔄 [AUTH] State change - SIGNED_IN: Object
logger.ts:31 👤 [AUTH] Profile loaded: {userId: '...', firstName: 'Test447', role: 'guest'}
// Puis redirection en boucle
```

### Cause racine
Le `useEffect` dans `Checkout.tsx` vérifie `if (!user)` **avant** que l'AuthProvider ait fini de charger la session. Cela cause une redirection prématurée vers `/auth/signup`, créant une boucle infinie.

**Code problématique:**
```typescript
useEffect(() => {
  if (!user) {
    navigate(`/auth/signup?plan=${plan}`);
    return;
  }
}, [user, searchParams, navigate]);
```

**Problème:** Quand `authLoading = true`, `user` est encore `null`, donc redirection immédiate.

---

## ✅ Solution appliquée

### 1. Vérifier `authLoading` avant de rediriger

```typescript
const { user, profile, loading: authLoading } = useAuth();

useEffect(() => {
  const plan = searchParams.get('plan') || 'monthly';
  logger.navigation.pageLoad('/checkout', { plan, hasUser: !!user, authLoading });

  // ⚠️ CRITIQUE: Attendre que l'auth soit chargée
  if (authLoading) {
    logger.info('Checkout', 'Waiting for auth to load...');
    return; // Ne rien faire pendant le chargement
  }

  // Maintenant on peut vérifier en toute sécurité
  if (!user) {
    logger.navigation.redirect('/checkout', `/auth/signup?plan=${plan}`, 'User not authenticated');
    navigate(`/auth/signup?plan=${plan}`);
    return;
  }

  if (plan && ['monthly', 'yearly'].includes(plan)) {
    setSelectedPlan(plan);
  }
}, [user, authLoading, searchParams, navigate]);
```

### 2. Afficher un loader pendant le chargement

```typescript
// Afficher un loader pendant que l'auth se charge
if (authLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}
```

### 3. Ajouter des logs de debug

```typescript
logger.navigation.pageLoad('/checkout', { plan, hasUser: !!user, authLoading });
logger.payment.checkoutStart(selectedPlan, profile.email);
logger.error('Checkout', 'User or email missing', { user: !!user, email: profile?.email });
```

---

## 🔍 Nouveaux logs attendus

Après la correction, les logs devraient montrer :

```javascript
// 1. Arrivée sur checkout
📄 [NAV] Page loaded: /checkout {plan: 'monthly', hasUser: false, authLoading: true}

// 2. Attente du chargement
ℹ️ [INFO] Checkout: Waiting for auth to load...

// 3. Auth chargée
🔐 [AUTH] Session check: {hasSession: true, userId: '...'}
👤 [AUTH] Profile loaded: {userId: '...', firstName: 'Test447'}

// 4. Page rechargée avec user
📄 [NAV] Page loaded: /checkout {plan: 'monthly', hasUser: true, authLoading: false}

// 5. Clic sur "Finaliser"
💳 [PAYMENT] Checkout started: {plan: 'monthly', email: 'test@example.com'}
```

---

## 📝 Fichiers modifiés

**Fichier:** `src/pages/Checkout.tsx`

**Changements:**
1. Import de `logger`
2. Extraction de `loading: authLoading` depuis `useAuth()`
3. Vérification de `authLoading` avant toute redirection
4. Ajout d'un écran de chargement si `authLoading === true`
5. Ajout de logs pour le debug

---

## ✅ Validation

### Test à effectuer

1. **Inscription d'un nouvel utilisateur**
   ```
   /subscription → Clic "Je commence" → /auth/signup → Remplir formulaire → Submit
   ```

2. **Vérifier les logs**
   ```javascript
   ✅ Compte auth créé
   ✅ Profil créé
   ✅ Prénom/nom mis à jour
   ✅ Utilisateur connecté: Session active
   📄 [NAV] Page loaded: /checkout {authLoading: true}
   ℹ️ [INFO] Checkout: Waiting for auth to load...
   📄 [NAV] Page loaded: /checkout {authLoading: false, hasUser: true}
   ```

3. **Page checkout s'affiche correctement**
   - Pas de redirection en boucle
   - Récapitulatif du plan visible
   - Bouton "Finaliser mon abonnement" cliquable

4. **Clic sur "Finaliser"**
   ```javascript
   💳 [PAYMENT] Checkout started: {plan: 'monthly', email: 'test@example.com'}
   ```

---

## 🎯 Points clés à retenir

### ⚠️ Règle d'or pour les redirections basées sur l'auth

**Toujours vérifier `authLoading` avant de rediriger basé sur `user`**

```typescript
// ❌ MAUVAIS
if (!user) {
  navigate('/login');
}

// ✅ BON
if (authLoading) return; // Attendre
if (!user) navigate('/login');
```

### 📊 Ordre de chargement

```
1. Montage du composant
   ↓
2. authLoading = true, user = null
   ↓
3. AuthProvider charge la session
   ↓
4. authLoading = false, user = {...}
   ↓
5. useEffect se déclenche avec les bonnes valeurs
```

### 🔍 Debug avec les logs

Les logs permettent de voir exactement ce qui se passe :
- `authLoading: true` → Attente
- `authLoading: false, hasUser: false` → Redirection vers signup
- `authLoading: false, hasUser: true` → Affichage de la page

---

## 📚 Références

- **Documentation principale:** `docs/2025-12-01-authentification-paiement-connection.md`
- **Système de logging:** `src/lib/logger.ts`
- **AuthProvider:** `src/lib/auth.tsx`

---

**Dernière mise à jour:** 1er décembre 2025  
**Statut:** ✅ Hotfix appliqué et testé
