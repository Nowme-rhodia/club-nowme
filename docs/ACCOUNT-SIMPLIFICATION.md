# Simplification de la page Account

## Objectif
Simplifier la page `/account` en supprimant les fonctionnalités inutiles et en redirigeant la gestion d'abonnement vers Stripe.

## Pages et liens supprimés

### ❌ Supprimés
1. **Mon QR Code** (`/account/qr-code`)
   - Description : "Accéder à mon QR code personnel"
   - Fichier : `src/pages/account/QRCode.tsx`
   
2. **Mes kiffs** (`/account/favorites`)
   - Description : "Voir mes activités favorites"
   - Fichier : `src/pages/account/Favorites.tsx`
   
3. **Historique** (`/account/history`)
   - Description : "Consulter mes réservations passées"
   - Fichier : `src/pages/account/History.tsx`
   
4. **Paramètres** (`/account/settings`)
   - Description : "Gérer mes préférences"
   - Fichier : `src/pages/account/Settings.tsx`

5. **Page Mon abonnement** (`/account/subscription`)
   - Description : "Voir les détails de mon abonnement"
   - Fichier : `src/pages/account/Subscription.tsx`
   - **Remplacé par** : Redirection vers Stripe Customer Portal

### ✅ Conservés
1. **Mes informations** (`/account/profile`)
   - Description : "Gérer mes informations personnelles"
   - Fichier : `src/pages/account/Profile.tsx`
   
2. **Mon abonnement** (bouton avec redirection Stripe)
   - Description : "Gérer mon abonnement Stripe"
   - Action : Ouvre le portail Stripe

## Modifications apportées

### 1. Page Account.tsx ✅

**Fichier :** `src/pages/Account.tsx`

#### Suppression des items de menu
```typescript
// Avant (❌ 6 items)
const menuItems = [
  { title: 'Mes informations', ... },
  { title: 'Mon abonnement', ... },
  { title: 'Mon QR Code', ... },
  { title: 'Mes kiffs', ... },
  { title: 'Historique', ... },
  { title: 'Paramètres', ... }
];

// Après (✅ 2 items)
const menuItems = [
  {
    title: 'Mes informations',
    icon: User,
    href: '/account/profile',
    description: 'Gérer mes informations personnelles',
    onClick: null
  },
  {
    title: 'Mon abonnement',
    icon: CreditCard,
    href: '#',
    description: 'Gérer mon abonnement Stripe',
    onClick: handleManageSubscription
  }
];
```

#### Ajout de la fonction handleManageSubscription
```typescript
const handleManageSubscription = async () => {
  try {
    // Créer une session Stripe Customer Portal
    const apiUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${apiUrl}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        customerId: profile?.stripe_customer_id,
        returnUrl: window.location.origin + '/account'
      })
    });

    const data = await response.json();
    
    if (data.url) {
      // Rediriger vers le portail Stripe
      window.location.href = data.url;
    } else {
      console.error('Erreur lors de la création de la session portail');
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

#### Modification du rendu pour gérer les clics
```typescript
// Rendu dynamique : button si onClick, sinon a
{menuItems.map((item) => (
  item.onClick ? (
    <button
      key={item.title}
      onClick={item.onClick}
      className="bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-all duration-300 group text-left w-full cursor-pointer"
    >
      {/* Contenu */}
    </button>
  ) : (
    <a
      key={item.title}
      href={item.href}
      className="bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-all duration-300 group"
    >
      {/* Contenu */}
    </a>
  )
))}
```

### 2. Routes supprimées dans App.tsx ✅

**Fichier :** `src/App.tsx`

```typescript
// Avant (❌)
<Route path="/account/qr-code" element={...} />
<Route path="/account/subscription" element={...} />
<Route path="/account/favorites" element={...} />
<Route path="/account/history" element={...} />
<Route path="/account/settings" element={...} />

// Après (✅)
// Supprimées
```

### 3. Imports supprimés dans App.tsx ✅

```typescript
// Avant (❌)
const QRCode = React.lazy(() => import('./pages/account/QRCode'));
const AccountSubscription = React.lazy(() => import('./pages/account/Subscription'));
const Favorites = React.lazy(() => import('./pages/account/Favorites'));
const History = React.lazy(() => import('./pages/account/History'));
const AccountSettings = React.lazy(() => import('./pages/account/Settings'));

// Après (✅)
// Supprimés
```

### 4. Interface UserProfile mise à jour ✅

**Fichier :** `src/lib/auth.tsx`

```typescript
interface UserProfile {
  // ... autres champs
  stripe_customer_id?: string; // ✅ Ajouté pour la gestion Stripe
  // ...
}
```

## Edge Function Stripe Customer Portal

**Fichier :** `supabase/functions/create-portal-session/index.ts`

Cette fonction existe déjà et crée une session Stripe Customer Portal :

```typescript
serve(async (req) => {
  const { customerId, returnUrl } = await req.json();
  
  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${req.headers.get('origin')}/account`,
  });

  return new Response(
    JSON.stringify({ url: session.url }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

## Flow de gestion d'abonnement

### Avant (❌)
```
/account → Clic "Mon abonnement" → /account/subscription → Page custom avec infos limitées
```

### Après (✅)
```
/account → Clic "Mon abonnement" → Stripe Customer Portal → Gestion complète
```

## Fonctionnalités du Stripe Customer Portal

Quand l'utilisateur clique sur "Mon abonnement", il est redirigé vers le portail Stripe où il peut :

1. ✅ **Voir les détails de l'abonnement**
   - Type de plan (mensuel/annuel)
   - Prix
   - Date de renouvellement
   - Historique des paiements

2. ✅ **Gérer le moyen de paiement**
   - Ajouter une carte
   - Modifier la carte
   - Supprimer une carte

3. ✅ **Modifier l'abonnement**
   - Upgrade (mensuel → annuel)
   - Downgrade (annuel → mensuel)
   - Changer de plan

4. ✅ **Annuler l'abonnement**
   - Annulation immédiate
   - Annulation à la fin de la période
   - Réactivation

5. ✅ **Télécharger les factures**
   - Historique complet
   - Format PDF

6. ✅ **Mettre à jour les informations de facturation**
   - Adresse
   - Email
   - Nom

## Avantages de cette approche

### 1. Moins de code à maintenir
- ❌ 5 pages supprimées
- ❌ 5 routes supprimées
- ❌ Logique de gestion d'abonnement custom supprimée

### 2. Fonctionnalités complètes
- ✅ Stripe gère tout (paiements, factures, annulations)
- ✅ Interface professionnelle et sécurisée
- ✅ Conformité PCI-DSS automatique

### 3. Meilleure UX
- ✅ Interface familière pour les utilisateurs
- ✅ Toutes les fonctionnalités en un seul endroit
- ✅ Pas de bugs liés à une implémentation custom

### 4. Sécurité
- ✅ Stripe gère les données sensibles
- ✅ Pas de stockage de cartes bancaires
- ✅ Conformité automatique

## Structure finale de /account

```
/account
├── En-tête
│   ├── Photo de profil
│   ├── Nom complet
│   ├── Date d'inscription
│   └── Badge de statut
│
├── Informations d'abonnement
│   ├── Type de plan
│   ├── Statut
│   └── Message (si discovery)
│
├── Menu de navigation (2 items)
│   ├── Mes informations → /account/profile
│   └── Mon abonnement → Stripe Portal
│
└── Bouton de déconnexion
```

## Tests à effectuer

### Test 1 : Accès à la page Account
1. ✅ Se connecter avec un compte abonné
2. ✅ Accéder à `/account`
3. ✅ Vérifier que seuls 2 items sont affichés
4. ✅ Vérifier que les anciennes routes ne sont plus accessibles

### Test 2 : Mes informations
1. ✅ Cliquer sur "Mes informations"
2. ✅ Vérifier redirection vers `/account/profile`
3. ✅ Vérifier que les informations s'affichent correctement

### Test 3 : Mon abonnement (Stripe Portal)
1. ✅ Cliquer sur "Mon abonnement"
2. ✅ Vérifier redirection vers Stripe Customer Portal
3. ✅ Vérifier que l'utilisateur peut :
   - Voir les détails de l'abonnement
   - Modifier le moyen de paiement
   - Télécharger les factures
   - Annuler l'abonnement
4. ✅ Cliquer sur "Retour" dans Stripe
5. ✅ Vérifier redirection vers `/account`

### Test 4 : Anciennes routes
1. ✅ Essayer d'accéder à `/account/qr-code` → 404
2. ✅ Essayer d'accéder à `/account/favorites` → 404
3. ✅ Essayer d'accéder à `/account/history` → 404
4. ✅ Essayer d'accéder à `/account/settings` → 404
5. ✅ Essayer d'accéder à `/account/subscription` → 404

## Fichiers à supprimer (optionnel)

Si vous voulez nettoyer complètement le projet :

```bash
# Supprimer les pages inutiles
rm src/pages/account/QRCode.tsx
rm src/pages/account/Subscription.tsx
rm src/pages/account/Favorites.tsx
rm src/pages/account/History.tsx
rm src/pages/account/Settings.tsx
```

## Configuration Stripe requise

Pour que le Customer Portal fonctionne, il faut :

1. **Activer le Customer Portal dans Stripe Dashboard**
   - Aller sur https://dashboard.stripe.com/settings/billing/portal
   - Activer le portail
   - Configurer les options (annulation, changement de plan, etc.)

2. **Variables d'environnement**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

3. **Déployer l'Edge Function**
   ```bash
   supabase functions deploy create-portal-session
   ```

## Conclusion

✅ **Page simplifiée** : 2 items au lieu de 6

✅ **Gestion professionnelle** : Stripe Customer Portal pour l'abonnement

✅ **Moins de maintenance** : 5 pages et routes supprimées

✅ **Meilleure UX** : Interface Stripe familière et complète

La page `/account` est maintenant plus simple, plus maintenable et offre une meilleure expérience utilisateur grâce à l'intégration native de Stripe.
