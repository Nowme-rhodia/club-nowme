# Flow 3 : Demande de Région

## 📋 Vue d'ensemble

Ce flow permet aux utilisateurs de demander l'ouverture de Nowme Club dans leur région si celle-ci n'est pas encore couverte.

## 🎯 Objectif

Collecter les demandes d'expansion géographique pour prioriser le développement de nouvelles régions et informer les utilisateurs intéressés lors du lancement.

## 🔄 Étapes du Flow

### 1. Affichage du Formulaire de Demande

**Page** : `/subscription` (`src/pages/Subscription.tsx`)

**Section** : "Pas encore chez toi ? Fais-le venir !" (ligne 347-387)

**Localisation** :
- Visible sur la page d'abonnement
- Section dédiée avec fond `bg-primary/5`
- Formulaire centré et mis en avant

**Régions disponibles** :
```typescript
const regions = [
  { value: '75', label: 'Paris (75)' },
  { value: '77', label: 'Seine-et-Marne (77)' },
  { value: '78', label: 'Yvelines (78)' },
  { value: '91', label: 'Essonne (91)' },
  { value: '92', label: 'Hauts-de-Seine (92)' },
  { value: '93', label: 'Seine-Saint-Denis (93)' },
  { value: '94', label: 'Val-de-Marne (94)' },
  { value: '95', label: "Val-d'Oise (95)" },
  { value: '13', label: 'Bouches-du-Rhône (13)' },
  { value: '33', label: 'Gironde (33)' },
  { value: '31', label: 'Haute-Garonne (31)' },
  { value: '69', label: 'Rhône (69)' },
  { value: '59', label: 'Nord (59)' },
  { value: '44', label: 'Loire-Atlantique (44)' },
  { value: 'autre', label: 'Autre région' },
];
```

---

### 2. Remplissage du Formulaire

**Champs requis** :
- **Email** : Email de l'utilisateur
- **Région** : Sélection dans la liste déroulante

**Validation** :
- Les deux champs sont obligatoires
- Format email valide
- Région sélectionnée dans la liste

**Code** : `src/pages/Subscription.tsx` (ligne 56-72)

```typescript
const handleRegionSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!regionForm.email || !regionForm.region) {
    toast.error('Remplis tout, stp !');
    return;
  }
  setIsSubmitting(true);
  try {
    await submitRegionRequest(regionForm.email, regionForm.region);
    toast.success('Top ! On te prévient dès que ça arrive chez toi.');
    setRegionForm({ email: '', region: '' });
  } catch (error) {
    toast.error('Oups, réessaie !');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 3. Soumission de la Demande

**Fonction** : `submitRegionRequest()` dans `src/lib/regions.ts`

**Actions** :
1. Validation des données
2. Insertion dans la table `region_requests`
3. Retour de confirmation

**Code attendu** :
```typescript
export async function submitRegionRequest(email: string, region: string) {
  const { data, error } = await supabase
    .from('region_requests')
    .insert({
      email,
      region,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  
  if (error) throw error;
  return data;
}
```

---

### 4. Enregistrement dans la Base de Données

**Table** : `region_requests`

**Schéma proposé** :
```sql
CREATE TABLE region_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  region TEXT NOT NULL,
  region_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'launched', 'cancelled')),
  
  -- Informations complémentaires
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notified_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_region_requests_email ON region_requests(email);
CREATE INDEX idx_region_requests_region ON region_requests(region);
CREATE INDEX idx_region_requests_status ON region_requests(status);
CREATE INDEX idx_region_requests_created ON region_requests(created_at DESC);

-- Index composite pour éviter les doublons
CREATE UNIQUE INDEX idx_region_requests_unique 
  ON region_requests(email, region) 
  WHERE status = 'pending';
```

**Colonnes** :
- `id` : UUID unique
- `email` : Email de l'utilisateur
- `region` : Code ou nom de la région
- `status` : Statut de la demande
- `created_at` : Date de création
- `notified_at` : Date de notification (quand la région est lancée)

---

### 5. Notification Admin (Optionnel)

**Edge Function** : `supabase/functions/notify-region-request/`

**Déclencheur** : Trigger sur `INSERT` dans `region_requests`

**Actions** :
1. Agrégation des demandes par région
2. Si seuil atteint (ex: 50 demandes), notification admin
3. Email récapitulatif hebdomadaire

**Email type** :
```
Nouvelles demandes de région

Région : Bouches-du-Rhône (13)
Nombre de demandes : 127
Dernière demande : il y a 2 heures

Top 5 régions demandées :
1. Bouches-du-Rhône (13) : 127 demandes
2. Gironde (33) : 89 demandes
3. Haute-Garonne (31) : 76 demandes
4. Rhône (69) : 54 demandes
5. Nord (59) : 43 demandes

Voir toutes les demandes : https://app.nowme.fr/admin/region-requests
```

---

### 6. Confirmation Utilisateur

**Affichage** :
- Toast de succès : "Top ! On te prévient dès que ça arrive chez toi."
- Réinitialisation du formulaire
- Possibilité de soumettre pour une autre région

**Pas d'email de confirmation** (pour éviter le spam)

---

### 7. Notification lors du Lancement

**Quand** : Lorsque Nowme Club lance une nouvelle région

**Edge Function** : `supabase/functions/notify-region-launch/`

**Actions** :
1. Sélection de tous les emails ayant demandé cette région
2. Envoi d'un email groupé
3. Mise à jour du statut à `'launched'`
4. Enregistrement de `notified_at`

**Email type** :
```
🎉 Nowme Club arrive dans ta région !

Bonjour,

Tu nous avais demandé d'arriver dans le Rhône (69), et c'est fait !

Nowme Club est maintenant disponible à Lyon et dans toute la région.

🎁 Offre de lancement :
- 1er mois à 9,99€ au lieu de 12,99€
- Code promo : LYON2024

Découvre nos offres : https://nowme.fr/lyon

À très vite,
L'équipe Nowme
```

**Code** :
```typescript
// Fonction pour notifier le lancement d'une région
export async function notifyRegionLaunch(region: string) {
  // 1. Récupérer tous les emails
  const { data: requests } = await supabase
    .from('region_requests')
    .select('email')
    .eq('region', region)
    .eq('status', 'pending');
  
  // 2. Envoyer les emails
  for (const request of requests) {
    await sendRegionLaunchEmail(request.email, region);
  }
  
  // 3. Mettre à jour le statut
  await supabase
    .from('region_requests')
    .update({
      status: 'launched',
      notified_at: new Date().toISOString()
    })
    .eq('region', region)
    .eq('status', 'pending');
}
```

---

## 🗄️ Tables de la Base de Données

### Table `region_requests`

**Colonnes principales** :
- `id` : UUID unique
- `email` : Email de l'utilisateur
- `region` : Région demandée
- `status` : `'pending'` | `'planned'` | `'launched'` | `'cancelled'`
- `created_at` : Date de création
- `notified_at` : Date de notification

**Contraintes** :
- Email + région unique pour les demandes `pending`
- Email au format valide

---

## 🔐 Sécurité (RLS)

### Policies `region_requests`

```sql
-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view own requests"
  ON region_requests FOR SELECT
  USING (email = auth.email());

-- Tout le monde peut créer une demande (même non connecté)
CREATE POLICY "Anyone can create request"
  ON region_requests FOR INSERT
  WITH CHECK (true);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all requests"
  ON region_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Les admins peuvent modifier
CREATE POLICY "Admins can update requests"
  ON region_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Service role a tous les droits
CREATE POLICY "Service role full access"
  ON region_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

---

## 📊 Dashboard Admin

**Page** : `/admin/region-requests` (à créer)

**Fonctionnalités** :
1. **Vue d'ensemble** :
   - Nombre total de demandes
   - Nombre de demandes par région
   - Graphique d'évolution

2. **Liste des régions** :
   - Tri par nombre de demandes
   - Statut de chaque région
   - Actions : Marquer comme "planifié", "lancé"

3. **Détails par région** :
   - Liste des emails
   - Date de première demande
   - Date de dernière demande
   - Export CSV

4. **Actions groupées** :
   - Notifier tous les utilisateurs d'une région
   - Exporter les emails pour campagne marketing
   - Marquer comme lancé

**Exemple de requête** :
```sql
-- Top régions demandées
SELECT 
  region,
  COUNT(*) as nb_requests,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM region_requests
WHERE status = 'pending'
GROUP BY region
ORDER BY nb_requests DESC
LIMIT 10;
```

---

## ⚠️ Points d'Attention / Problèmes Actuels

### 🔴 Problèmes identifiés

1. **Pas de table `region_requests`**
   - La fonction `submitRegionRequest()` n'existe peut-être pas
   - Besoin de créer la migration

2. **Pas de validation email**
   - Risque de faux emails
   - Pas de vérification de l'existence

3. **Doublons possibles**
   - Un utilisateur peut soumettre plusieurs fois
   - Pas de contrainte UNIQUE

4. **Pas de GDPR compliance**
   - Stockage d'emails sans consentement explicite
   - Pas de possibilité de se désinscrire

### ✅ Solutions recommandées

1. **Créer la table et la fonction**
   - Migration SQL pour `region_requests`
   - Implémenter `submitRegionRequest()` dans `src/lib/regions.ts`

2. **Validation email**
   - Vérifier le format côté serveur
   - Envoyer un email de confirmation (optionnel)

3. **Contrainte UNIQUE**
   - Index unique sur `(email, region)` pour status `pending`
   - Message d'erreur explicite si doublon

4. **GDPR**
   - Checkbox de consentement
   - Lien de désinscription dans les emails
   - Politique de conservation des données

---

## 🧪 Tests Recommandés

1. ✅ Soumission d'une demande valide
2. ✅ Validation des champs obligatoires
3. ✅ Format email invalide
4. ✅ Doublon détecté
5. ✅ Toast de succès affiché
6. ✅ Formulaire réinitialisé
7. ✅ Données enregistrées en base
8. ✅ Notification admin (si seuil atteint)
9. ✅ Email de lancement envoyé
10. ✅ Statut mis à jour après notification

---

## 📊 Diagramme de Séquence

```
Utilisateur       Frontend        Function         Database         Admin
    |                |                |                |               |
    |-- Formulaire ->|                |                |               |
    |                |                |                |               |
    |-- Submit ----->|                |                |               |
    |                |                |                |               |
    |                |-- submitRegion ->               |               |
    |                |   Request      |-- INSERT ----->|               |
    |                |                |         region_requests        |
    |                |                |                |               |
    |                |                |<-- TRIGGER ----|               |
    |                |                |   (si seuil)   |               |
    |                |                |                |               |
    |                |                |-- notify-admin ->              |
    |                |                |                |-- Email ----->|
    |                |                |                |   "50 demandes|
    |                |                |                |   pour Lyon"  |
    |                |                |                |               |
    |                |<-- Success ----|                |               |
    |<-- Toast "Top !"               |                |               |
    |                |                |                |               |
    |                |                |                |               |
    |                |         [Quelques semaines plus tard]           |
    |                |                |                |               |
    |                |                |<-- Launch region -------------|
    |                |                |   Lyon         |               |
    |                |                |                |               |
    |                |                |-- SELECT ------>               |
    |                |                |   emails       |               |
    |                |                |                |               |
    |                |                |-- send-emails ->               |
    |<-- Email "Nowme arrive à Lyon !"                |               |
    |                |                |                |               |
    |                |                |-- UPDATE ------>               |
    |                |                |   status='launched'            |
```

---

## 🔗 Fichiers Concernés

### Frontend
- `src/pages/Subscription.tsx` (ligne 347-387)
- `src/lib/regions.ts` (à créer)

### Backend (Edge Functions)
- `supabase/functions/notify-region-request/` (à créer)
- `supabase/functions/notify-region-launch/` (à créer)

### Database
- Migration pour créer `region_requests`
- Triggers pour notifications

### Admin
- `src/pages/admin/RegionRequests.tsx` (à créer)

---

## 📝 Migration SQL à Créer

```sql
-- Créer la table region_requests
CREATE TABLE IF NOT EXISTS region_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  region TEXT NOT NULL,
  region_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'launched', 'cancelled')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notified_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ
);

-- Index
CREATE INDEX idx_region_requests_email ON region_requests(email);
CREATE INDEX idx_region_requests_region ON region_requests(region);
CREATE INDEX idx_region_requests_status ON region_requests(status);
CREATE INDEX idx_region_requests_created ON region_requests(created_at DESC);

-- Contrainte unique
CREATE UNIQUE INDEX idx_region_requests_unique 
  ON region_requests(email, region) 
  WHERE status = 'pending';

-- RLS
ALTER TABLE region_requests ENABLE ROW LEVEL SECURITY;

-- Policies (voir section Sécurité)
```

---

## 📈 Métriques à Suivre

1. **Nombre de demandes par région**
2. **Taux de conversion** (demande → abonnement au lancement)
3. **Délai moyen** entre demande et lancement
4. **Taux d'ouverture** des emails de lancement
5. **Régions les plus demandées**

---

**Dernière mise à jour** : Novembre 2024
