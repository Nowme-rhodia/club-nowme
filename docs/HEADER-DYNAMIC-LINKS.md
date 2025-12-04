# Header : Liens dynamiques selon le statut utilisateur

## Problème
Les liens "Communauté" et "Club" dans le header étaient visibles pour tous les utilisateurs, même ceux qui ne sont pas abonnés.

## Solution

### Modification du Header

**Fichier :** `src/components/Header.tsx`

#### 1. Ajout de `isSubscriber` dans le hook useAuth

```typescript
const { user, profile, isAdmin, isPartner, isSubscriber, signOut } = useAuth();
```

#### 2. Modification de `navigationItems`

```typescript
// Avant (❌)
const navigationItems = [
  { name: 'Accueil', path: '/' },
  { name: 'Catégories', path: '/categories' },
  { name: 'Tous les kiffs', path: '/tous-les-kiffs' },
  { name: 'Communauté', path: '/community-space', requiresAuth: true }, // ❌ Vérifie juste user
  { name: 'Club', path: '/club', requiresAuth: true }, // ❌ Vérifie juste user
  { name: 'Abonnement', path: '/subscription' }
];

// Après (✅)
const navigationItems = [
  { name: 'Accueil', path: '/' },
  { name: 'Catégories', path: '/categories' },
  { name: 'Tous les kiffs', path: '/tous-les-kiffs' },
  { name: 'Communauté', path: '/community-space', requiresSubscription: true }, // ✅ Vérifie isSubscriber
  { name: 'Club', path: '/club', requiresSubscription: true }, // ✅ Vérifie isSubscriber
  { name: 'Abonnement', path: '/subscription' }
];
```

#### 3. Modification de la logique de filtrage (Desktop)

```typescript
// Avant (❌)
navigationItems.map((item) =>
  item.requiresAuth && !user ? null : (
    <Link key={item.name} to={item.path}>
      {item.name}
    </Link>
  )
)

// Après (✅)
navigationItems.map((item) =>
  item.requiresSubscription && !isSubscriber ? null : (
    <Link key={item.name} to={item.path}>
      {item.name}
    </Link>
  )
)
```

#### 4. Modification de la logique de filtrage (Mobile)

Même changement pour la navigation mobile :

```typescript
// Avant (❌)
navigationItems.map((item) =>
  item.requiresAuth && !user ? null : (
    <Link key={item.name} to={item.path}>
      {item.name}
    </Link>
  )
)

// Après (✅)
navigationItems.map((item) =>
  item.requiresSubscription && !isSubscriber ? null : (
    <Link key={item.name} to={item.path}>
      {item.name}
    </Link>
  )
)
```

## Résultat

### Pour un utilisateur non abonné (guest ou authenticated)

**Navigation visible :**
- ✅ Accueil
- ✅ Catégories
- ✅ Tous les kiffs
- ❌ Communauté (masqué)
- ❌ Club (masqué)
- ✅ Abonnement

### Pour un utilisateur abonné (subscriber)

**Navigation visible :**
- ✅ Accueil
- ✅ Catégories
- ✅ Tous les kiffs
- ✅ Communauté
- ✅ Club
- ✅ Abonnement

## Comportement complet

### Scénario 1 : Utilisateur non connecté
```
Header affiche :
- Accueil, Catégories, Tous les kiffs, Abonnement
- Bouton "Tester à 12,99€"
- Bouton "Se connecter"
```

### Scénario 2 : Utilisateur connecté mais pas abonné
```
Header affiche :
- Accueil, Catégories, Tous les kiffs, Abonnement
- Bouton "Tester à 12,99€"
- Bouton "Mon compte" (ou prénom)
```

### Scénario 3 : Utilisateur abonné
```
Header affiche :
- Accueil, Catégories, Tous les kiffs, Communauté, Club, Abonnement
- Bouton "Tester à 12,99€" (pourrait être changé en "Mon compte")
- Bouton "Mon compte" (ou prénom)
```

## Protection des routes

Les routes `/community-space` et `/club` sont également protégées par `PrivateRoute` :

```typescript
<Route path="/club" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <ClubDashboard />
  </PrivateRoute>
} />

<Route path="/community-space" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <CommunitySpace />
  </PrivateRoute>
} />
```

**Double protection :**
1. **UI** : Les liens ne sont pas visibles dans le header
2. **Routes** : Même si quelqu'un tape l'URL directement, il est redirigé vers `/subscription`

## Tests à effectuer

### Test 1 : Utilisateur non connecté
1. ✅ Ouvrir le site en navigation privée
2. ✅ Vérifier que "Communauté" et "Club" ne sont PAS visibles dans le header
3. ✅ Essayer d'accéder à `/community-space` → redirigé vers `/auth/signin`
4. ✅ Essayer d'accéder à `/club` → redirigé vers `/auth/signin`

### Test 2 : Utilisateur connecté mais pas abonné
1. ✅ Se connecter avec un compte sans abonnement
2. ✅ Vérifier que "Communauté" et "Club" ne sont PAS visibles dans le header
3. ✅ Essayer d'accéder à `/community-space` → redirigé vers `/subscription`
4. ✅ Essayer d'accéder à `/club` → redirigé vers `/subscription`

### Test 3 : Utilisateur abonné
1. ✅ Se connecter avec un compte abonné
2. ✅ Vérifier que "Communauté" et "Club" SONT visibles dans le header
3. ✅ Cliquer sur "Communauté" → accès à la page
4. ✅ Cliquer sur "Club" → accès à la page

### Test 4 : Mobile
1. ✅ Répéter les tests 1-3 sur mobile
2. ✅ Vérifier que le menu burger affiche les mêmes liens selon le statut

## Améliorations possibles

### 1. Badge "Premium" sur les liens réservés
Ajouter un badge pour indiquer que certains liens sont réservés aux abonnés :

```tsx
<Link to="/community-space">
  Communauté
  {!isSubscriber && <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded">Premium</span>}
</Link>
```

### 2. Tooltip explicatif
Afficher un tooltip au survol pour les non-abonnés :

```tsx
<div className="relative group">
  <span className="text-gray-400 cursor-not-allowed">
    Communauté
  </span>
  <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 -bottom-10 left-0 whitespace-nowrap">
    Réservé aux membres
  </div>
</div>
```

### 3. Bouton CTA dynamique
Changer le bouton "Tester à 12,99€" selon le statut :

```tsx
{isSubscriber ? (
  <Link to="/account" className="...">
    Mon compte
  </Link>
) : (
  <Link to="/subscription" className="...">
    Tester à 12,99€
  </Link>
)}
```

## Conclusion

✅ **Liens masqués** : "Communauté" et "Club" ne sont visibles que pour les abonnés

✅ **Double protection** : UI + Routes protégées

✅ **UX cohérente** : Desktop et mobile ont le même comportement

✅ **Sécurité** : Impossible d'accéder aux pages premium sans abonnement
