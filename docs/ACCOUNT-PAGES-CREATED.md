# Pages Account créées

## Problème
Les liens de la page `/account` pointaient vers des routes qui n'existaient pas, causant des erreurs 404.

## Pages créées

### 1. `/account/profile` - Mes informations ✅
**Fichier :** `src/pages/account/Profile.tsx`

**Contenu :**
- Affichage du prénom, nom, email, téléphone
- Date d'inscription (dynamique depuis `profile.created_at`)
- Bouton "Modifier mes informations" (à implémenter)

### 2. `/account/subscription` - Mon abonnement ✅
**Fichier :** `src/pages/account/Subscription.tsx`

**Contenu :**
- Type d'abonnement (Premium 39,99€)
- Statut (Actif/Inactif)
- Prochaine date de facturation (depuis `profile.subscription.current_period_end`)
- Liste des avantages inclus
- Bouton "Annuler mon abonnement" (à implémenter)

### 3. `/account/favorites` - Mes kiffs ✅
**Fichier :** `src/pages/account/Favorites.tsx`

**Contenu :**
- État vide avec message "Vous n'avez pas encore de kiffs favoris"
- Bouton "Découvrir les kiffs" → `/tous-les-kiffs`
- À implémenter : Liste des offres favorites

### 4. `/account/history` - Historique ✅
**Fichier :** `src/pages/account/History.tsx`

**Contenu :**
- État vide avec message "Aucune réservation pour le moment"
- Bouton "Réserver une activité" → `/tous-les-kiffs`
- À implémenter : Liste des réservations passées

### 5. `/account/settings` - Paramètres ✅
**Fichier :** `src/pages/account/Settings.tsx`

**Contenu :**
- **Notifications** : Emails promotionnels, notifications de réservation, nouveaux kiffs
- **Confidentialité** : Profil public, partager mes activités
- **Langue** : Français/English
- **Sécurité** : Bouton "Changer mon mot de passe"
- Bouton "Enregistrer les modifications" (à implémenter)

### 6. `/account/qr-code` - Mon QR Code ✅
**Fichier :** `src/pages/account/QRCode.tsx` (existait déjà)

## Routes ajoutées dans App.tsx

```typescript
// Imports
const Profile = React.lazy(() => import('./pages/account/Profile'));
const AccountSubscription = React.lazy(() => import('./pages/account/Subscription'));
const Favorites = React.lazy(() => import('./pages/account/Favorites'));
const History = React.lazy(() => import('./pages/account/History'));
const AccountSettings = React.lazy(() => import('./pages/account/Settings'));

// Routes
<Route path="/account/profile" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <Profile />
  </PrivateRoute>
} />
<Route path="/account/subscription" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <AccountSubscription />
  </PrivateRoute>
} />
<Route path="/account/favorites" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <Favorites />
  </PrivateRoute>
} />
<Route path="/account/history" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <History />
  </PrivateRoute>
} />
<Route path="/account/settings" element={
  <PrivateRoute allowedRoles={['subscriber']}>
    <AccountSettings />
  </PrivateRoute>
} />
```

**Note :** Renommé `Subscription` → `AccountSubscription` et `Settings` → `AccountSettings` pour éviter les conflits avec les pages existantes.

## Fonctionnalités à implémenter

### 1. Modifier les informations personnelles
- Formulaire d'édition dans `/account/profile`
- Mise à jour dans Supabase `user_profiles`

### 2. Gestion des favoris
- Ajouter/retirer des offres aux favoris
- Table `favorites` dans Supabase
- Affichage de la liste dans `/account/favorites`

### 3. Historique des réservations
- Table `bookings` dans Supabase
- Affichage de la liste dans `/account/history`
- Détails de chaque réservation

### 4. Annulation d'abonnement
- Appel à l'API Stripe pour annuler
- Mise à jour du statut dans `subscriptions`
- Confirmation avant annulation

### 5. Changement de mot de passe
- Formulaire dans `/account/settings`
- Utilisation de `supabase.auth.updateUser({ password })`

### 6. Sauvegarde des préférences
- Table `user_preferences` dans Supabase
- Sauvegarde des paramètres de notifications, confidentialité, langue

## Design

Toutes les pages suivent le même design :
- **Fond** : Gradient `from-[#FDF8F4] via-white to-[#FDF8F4]`
- **Container** : `max-w-3xl` ou `max-w-7xl` selon le contenu
- **Cards** : `bg-white rounded-2xl shadow-soft p-8`
- **Sections** : `bg-gray-50 rounded-xl p-6`
- **Boutons primaires** : `bg-primary text-white`
- **Icônes** : Lucide React (User, Mail, Phone, Calendar, etc.)

## Navigation

Depuis `/account`, tous les liens fonctionnent maintenant :
- ✅ `/account/profile` - Mes informations
- ✅ `/account/subscription` - Mon abonnement
- ✅ `/account/qr-code` - Mon QR Code
- ✅ `/account/favorites` - Mes kiffs
- ✅ `/account/history` - Historique
- ✅ `/account/settings` - Paramètres

## Prochaines étapes

1. **Implémenter les formulaires d'édition**
   - Profil
   - Paramètres

2. **Créer les tables manquantes**
   ```sql
   CREATE TABLE favorites (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     offer_id UUID REFERENCES offers(id),
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE user_preferences (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id),
     email_promotions BOOLEAN DEFAULT TRUE,
     booking_notifications BOOLEAN DEFAULT TRUE,
     new_offers_notifications BOOLEAN DEFAULT TRUE,
     public_profile BOOLEAN DEFAULT FALSE,
     share_activities BOOLEAN DEFAULT FALSE,
     language TEXT DEFAULT 'fr'
   );
   ```

3. **Ajouter les fonctionnalités interactives**
   - Ajouter/retirer des favoris
   - Voir les détails des réservations
   - Annuler l'abonnement
   - Changer le mot de passe
   - Sauvegarder les préférences

4. **Tests**
   - Vérifier que toutes les pages se chargent
   - Vérifier que les données s'affichent correctement
   - Tester les formulaires
