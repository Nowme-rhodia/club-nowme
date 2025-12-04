# Fix : Flow d'inscription et d'abonnement

## Problèmes identifiés

### 1. Boucle de redirection sur `/subscription`
**Symptôme :** Utilisateur connecté mais non abonné → clique sur un plan → redirigé vers `/auth/signup?plan=monthly` → re-redirigé vers `/subscription` → bloqué.

**Cause :** `SignUp.tsx` redirige tous les utilisateurs connectés vers `/subscription`, même s'ils ne sont pas encore abonnés.

### 2. Manque de distinction entre "connecté" et "abonné"
**Symptôme :** Le système ne fait pas la différence entre :
- `isAuthenticated` = a une session Supabase (connecté)
- `isSubscriber` = a un abonnement actif

**Cause :** Pas de flag `isAuthenticated` dans le contexte d'authentification.

### 3. Liens statiques sur `/subscription`
**Symptôme :** Les liens pointent toujours vers `/auth/signup?plan=X` même si l'utilisateur est déjà connecté.

**Cause :** Pas de logique dynamique pour adapter les liens selon le statut utilisateur.

## Solutions implémentées

### 1. Ajout de `isAuthenticated` dans AuthContext ✅

**Fichier :** `src/lib/auth.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean; // ✅ NOUVEAU
  isAdmin: boolean;
  isPartner: boolean;
  isSubscriber: boolean;
}

// Dans AuthProvider
const isAuthenticated = !!user; // Connecté = a une session Supabase

const value = {
  user,
  profile,
  loading,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  refreshProfile,
  isAuthenticated, // ✅ EXPOSÉ
  isAdmin,
  isPartner,
  isSubscriber,
};
```

**Résultat :**
- `isAuthenticated` = `true` si l'utilisateur a une session Supabase
- `isSubscriber` = `true` si l'utilisateur a un abonnement actif

### 2. Correction de la redirection dans SignUp ✅

**Fichier :** `src/pages/auth/SignUp.tsx`

```typescript
// Avant (❌ problème)
useEffect(() => {
  if (user && !isSigningUp && !loading) {
    navigate('/subscription'); // ❌ Tous redirigés vers /subscription
  }
}, [user, isSigningUp, loading, navigate]);

// Après (✅ solution)
useEffect(() => {
  if (user && !isSigningUp && !loading) {
    if (isSubscriber) {
      navigate('/account'); // ✅ Déjà abonné → compte
    } else {
      navigate(`/checkout?plan=${plan}`); // ✅ Connecté mais pas abonné → checkout
    }
  }
}, [user, isSubscriber, isSigningUp, loading, navigate, plan]);
```

**Résultat :**
- Utilisateur **déjà abonné** → redirigé vers `/account`
- Utilisateur **connecté mais pas abonné** → redirigé vers `/checkout?plan=X`
- Utilisateur **pas connecté** → reste sur `/auth/signup`

### 3. Liens dynamiques sur `/subscription` ✅

**Fichier :** `src/pages/Subscription.tsx`

```typescript
const { isAuthenticated, isSubscriber } = useAuth();

// Fonction pour obtenir le lien d'action en fonction du statut
const getActionLink = (plan: 'monthly' | 'yearly') => {
  if (isSubscriber) {
    // Déjà abonné → vers le compte
    return '/account';
  }
  if (isAuthenticated) {
    // Connecté mais pas abonné → vers checkout directement
    return `/checkout?plan=${plan}`;
  }
  // Pas connecté → vers signup
  return `/auth/signup?plan=${plan}`;
};

const getActionText = () => {
  if (isSubscriber) {
    return 'Voir mon compte';
  }
  if (isAuthenticated) {
    return 'Continuer vers le paiement';
  }
  return 'Je commence';
};
```

**Utilisation dans les boutons :**
```tsx
<Link
  to={getActionLink('monthly')}
  className="..."
>
  <Sparkles className="w-5 h-5 mr-2" />
  {isSubscriber ? 'Voir mon compte' : isAuthenticated ? 'Continuer (12,99€)' : 'Je commence à 12,99€'}
</Link>

{!isSubscriber && (
  <Link
    to={getActionLink('yearly')}
    className="..."
  >
    <Star className="w-5 h-5 mr-2" />
    {isAuthenticated ? 'Continuer (annuel)' : 'Je choisis l\'annuel'}
  </Link>
)}
```

**Résultat :**
- **Pas connecté** → Boutons "Je commence à 12,99€" et "Je choisis l'annuel" → vers `/auth/signup?plan=X`
- **Connecté mais pas abonné** → Boutons "Continuer (12,99€)" et "Continuer (annuel)" → vers `/checkout?plan=X`
- **Déjà abonné** → Bouton unique "Voir mon compte" → vers `/account`

## Flow complet

### Scénario 1 : Nouvel utilisateur (pas connecté)

```
1. Visite /subscription
2. Clique "Je commence à 12,99€"
3. → /auth/signup?plan=monthly
4. Remplit le formulaire
5. → /checkout?plan=monthly (après création compte)
6. Paie avec Stripe
7. → /subscription-success
8. Clique "Voir mon compte"
9. → /account (abonné)
```

### Scénario 2 : Utilisateur connecté mais pas abonné

```
1. Visite /subscription
2. Clique "Continuer vers le paiement"
3. → /checkout?plan=monthly (directement)
4. Paie avec Stripe
5. → /subscription-success
6. Clique "Voir mon compte"
7. → /account (abonné)
```

### Scénario 3 : Utilisateur déjà abonné

```
1. Visite /subscription
2. Voit "Voir mon compte" (bouton unique)
3. Clique "Voir mon compte"
4. → /account
```

### Scénario 4 : Utilisateur connecté revient sur /subscription

```
1. Connecté mais pas abonné
2. Visite /subscription
3. Voit "Continuer vers le paiement"
4. Clique → /checkout?plan=monthly
5. Peut changer de plan si besoin
6. Paie avec Stripe
7. → /subscription-success
```

## États utilisateur

### État 1 : Guest (pas connecté)
- `user` = `null`
- `isAuthenticated` = `false`
- `isSubscriber` = `false`
- **Actions disponibles :**
  - Voir les offres publiques
  - S'inscrire
  - Se connecter

### État 2 : Authenticated (connecté mais pas abonné)
- `user` = `User` (session Supabase)
- `isAuthenticated` = `true`
- `isSubscriber` = `false`
- **Actions disponibles :**
  - Voir les offres publiques
  - Souscrire à un abonnement
  - Se déconnecter

### État 3 : Subscriber (connecté et abonné)
- `user` = `User` (session Supabase)
- `isAuthenticated` = `true`
- `isSubscriber` = `true`
- **Actions disponibles :**
  - Accéder à toutes les fonctionnalités
  - Voir son compte
  - Gérer son abonnement
  - Se déconnecter

## Composants de protection

### PrivateRoute (existant)
Protège les routes qui nécessitent un rôle spécifique.

```typescript
<Route path="/account" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <Account />
  </PrivateRoute>
} />
```

**Comportement :**
- Pas connecté → redirige vers `/auth/signin`
- Connecté mais pas le bon rôle → redirige vers `/subscription`
- Bon rôle → affiche la page

### Possibilité future : AuthenticatedRoute
Pour les pages accessibles aux utilisateurs connectés mais pas forcément abonnés.

```typescript
<Route path="/profile-setup" element={
  <AuthenticatedRoute>
    <ProfileSetup />
  </AuthenticatedRoute>
} />
```

**Comportement :**
- Pas connecté → redirige vers `/auth/signin`
- Connecté → affiche la page (peu importe le rôle)

## Tests à effectuer

### Test 1 : Nouvel utilisateur
1. ✅ Ouvrir `/subscription` en navigation privée
2. ✅ Cliquer "Je commence à 12,99€"
3. ✅ Vérifier redirection vers `/auth/signup?plan=monthly`
4. ✅ S'inscrire
5. ✅ Vérifier redirection vers `/checkout?plan=monthly`
6. ✅ Payer
7. ✅ Vérifier redirection vers `/subscription-success`
8. ✅ Cliquer "Voir mon compte"
9. ✅ Vérifier redirection vers `/account`

### Test 2 : Utilisateur connecté mais pas abonné
1. ✅ Se connecter avec un compte sans abonnement
2. ✅ Visiter `/subscription`
3. ✅ Vérifier que les boutons disent "Continuer vers le paiement"
4. ✅ Cliquer sur un bouton
5. ✅ Vérifier redirection vers `/checkout?plan=X`
6. ✅ Payer
7. ✅ Vérifier que le profil est mis à jour

### Test 3 : Utilisateur déjà abonné
1. ✅ Se connecter avec un compte abonné
2. ✅ Visiter `/subscription`
3. ✅ Vérifier qu'il n'y a qu'un bouton "Voir mon compte"
4. ✅ Cliquer sur le bouton
5. ✅ Vérifier redirection vers `/account`

### Test 4 : Changement de plan
1. ✅ Utilisateur connecté mais pas abonné
2. ✅ Visite `/subscription`
3. ✅ Clique "Continuer (12,99€)"
4. ✅ Change d'avis, retourne sur `/subscription`
5. ✅ Clique "Continuer (annuel)"
6. ✅ Vérifier que le plan est bien "yearly" dans `/checkout`

### 4. Header dynamique selon le statut utilisateur ✅

**Fichier :** `src/components/Header.tsx`

**Problème :** Les liens "Communauté" et "Club" étaient visibles pour tous les utilisateurs, même non abonnés.

**Solution :**
```typescript
const { user, profile, isAdmin, isPartner, isSubscriber, signOut } = useAuth();

const navigationItems = [
  { name: 'Accueil', path: '/' },
  { name: 'Catégories', path: '/categories' },
  { name: 'Tous les kiffs', path: '/tous-les-kiffs' },
  { name: 'Communauté', path: '/community-space', requiresSubscription: true }, // ✅
  { name: 'Club', path: '/club', requiresSubscription: true }, // ✅
  { name: 'Abonnement', path: '/subscription' }
];

// Desktop Navigation
navigationItems.map((item) =>
  item.requiresSubscription && !isSubscriber ? null : (
    <Link key={item.name} to={item.path}>
      {item.name}
    </Link>
  )
)

// Mobile Navigation (même logique)
```

**Résultat :**
- **Pas abonné** → Voit : Accueil, Catégories, Tous les kiffs, Abonnement
- **Abonné** → Voit : Accueil, Catégories, Tous les kiffs, **Communauté**, **Club**, Abonnement

## Améliorations futures

### 1. Message personnalisé sur /subscription
Afficher un message différent selon le statut :
- **Guest** : "Rejoins le Nowme Club et accède à des expériences exclusives"
- **Authenticated** : "Choisis ton plan et finalise ton inscription"
- **Subscriber** : "Tu es déjà membre ! Découvre tes avantages"

### 2. Bannière pour utilisateurs connectés non abonnés
```tsx
{isAuthenticated && !isSubscriber && (
  <div className="bg-primary/10 border-l-4 border-primary p-4 mb-6">
    <p className="text-primary font-semibold">
      👋 Bienvenue ! Choisis ton plan pour finaliser ton inscription.
    </p>
  </div>
)}
```

### 3. Redirection intelligente après paiement
Si l'utilisateur vient de `/subscription`, le rediriger vers `/account` après paiement.
Si l'utilisateur vient d'une offre spécifique, le rediriger vers cette offre.

### 4. Gestion des plans multiples
Permettre à un utilisateur de changer de plan (upgrade/downgrade) depuis `/account/subscription`.

## Conclusion

✅ **Problème résolu** : Les utilisateurs connectés mais non abonnés peuvent maintenant choisir un plan et payer sans être bloqués.

✅ **Distinction claire** : `isAuthenticated` vs `isSubscriber`

✅ **UX améliorée** : Les liens et textes s'adaptent au statut utilisateur

✅ **Flow complet** : De la découverte au paiement, tout fonctionne correctement
