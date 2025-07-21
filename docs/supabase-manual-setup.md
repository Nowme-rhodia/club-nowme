# Configuration manuelle Supabase - Nowme Club

## 🔧 ÉTAPES À SUIVRE DANS SUPABASE

### 1. VÉRIFIER LES COLONNES MANQUANTES

#### Dans `user_profiles`, ajouter si manquant :
```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_type text;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
```

### 2. ACTIVER RLS SUR TOUTES LES TABLES

Allez dans **Authentication** → **Policies** et pour chaque table, cliquez sur "Enable RLS" :

```sql
-- Copier-coller dans SQL Editor :
ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE masterclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE masterclass_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;
```

### 3. CRÉER LES POLITIQUES RLS ESSENTIELLES

#### Pour `club_events` :
```sql
-- Politique 1 : Lecture pour membres actifs
CREATE POLICY "Members can view events" ON club_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
  )
);
```

#### Pour `event_registrations` :
```sql
-- Politique 1 : Gestion de ses propres inscriptions
CREATE POLICY "Users can manage their registrations" ON event_registrations
FOR ALL TO authenticated
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

#### Pour `masterclasses` :
```sql
-- Politique 1 : Lecture pour membres premium
CREATE POLICY "Premium members can access masterclasses" ON masterclasses
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
    AND subscription_type = 'premium'
  )
);
```

#### Pour `masterclass_attendees` :
```sql
-- Politique 1 : Gestion de ses propres inscriptions
CREATE POLICY "Users can manage their masterclass attendance" ON masterclass_attendees
FOR ALL TO authenticated
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

#### Pour `wellness_consultations` :
```sql
-- Politique 1 : Gestion de ses propres consultations
CREATE POLICY "Users can manage their consultations" ON wellness_consultations
FOR ALL TO authenticated
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

#### Pour `club_boxes` :
```sql
-- Politique 1 : Lecture pour membres premium
CREATE POLICY "Premium members can view boxes" ON club_boxes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
    AND subscription_type = 'premium'
  )
);
```

#### Pour `box_shipments` :
```sql
-- Politique 1 : Voir ses propres expéditions
CREATE POLICY "Users can view their shipments" ON box_shipments
FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

#### Pour `member_rewards` :
```sql
-- Politique 1 : Voir ses propres récompenses
CREATE POLICY "Users can view their rewards" ON member_rewards
FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

### 4. CRÉER LES FONCTIONS UTILITAIRES

#### Fonction pour les compteurs d'événements :
```sql
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE club_events 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE club_events 
    SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### Fonction pour les compteurs de masterclasses :
```sql
CREATE OR REPLACE FUNCTION update_masterclass_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE masterclasses 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.masterclass_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE masterclasses 
    SET current_participants = GREATEST(current_participants - 1, 0)
    WHERE id = OLD.masterclass_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

#### Fonction pour créer automatiquement les récompenses :
```sql
CREATE OR REPLACE FUNCTION create_member_rewards()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_rewards (user_id, points_earned, points_spent, points_balance, tier_level)
  VALUES (NEW.id, 0, 0, 0, 'bronze');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5. CRÉER LES TRIGGERS

```sql
-- Trigger pour les événements
CREATE TRIGGER update_event_participants_trigger
  AFTER INSERT OR DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_participants();

-- Trigger pour les masterclasses
CREATE TRIGGER update_masterclass_participants_trigger
  AFTER INSERT OR DELETE ON masterclass_attendees
  FOR EACH ROW EXECUTE FUNCTION update_masterclass_participants();

-- Trigger pour créer automatiquement les récompenses
CREATE TRIGGER create_member_rewards_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION create_member_rewards();
```

### 6. CRÉER LES INDEX POUR LES PERFORMANCES

```sql
-- Index sur les événements
CREATE INDEX IF NOT EXISTS idx_club_events_date ON club_events(date_time);
CREATE INDEX IF NOT EXISTS idx_club_events_type ON club_events(event_type);

-- Index sur les inscriptions
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);

-- Index sur les masterclasses
CREATE INDEX IF NOT EXISTS idx_masterclasses_date ON masterclasses(date_time);

-- Index sur les consultations
CREATE INDEX IF NOT EXISTS idx_wellness_consultations_user ON wellness_consultations(user_id);

-- Index sur les récompenses
CREATE INDEX IF NOT EXISTS idx_member_rewards_user ON member_rewards(user_id);

-- Index sur les box
CREATE INDEX IF NOT EXISTS idx_box_shipments_user ON box_shipments(user_id);
```

### 7. METTRE À JOUR LE WEBHOOK STRIPE

Dans **Edge Functions** → **stripe-webhook**, vérifier que le code gère bien `subscription_type` :

```typescript
// Dans le webhook, ajouter la détection du type d'abonnement
const isDiscoveryPrice = sessionData.amount_total === 1299; // 12,99€
const isPremiumPrice = sessionData.amount_total === 3999;   // 39,99€

// Lors de la création/mise à jour du profil
subscription_type: isDiscoveryPrice ? "discovery" : "premium"
```

### 8. TESTER LA CONFIGURATION

#### Créer un événement test :
```sql
INSERT INTO club_events (title, description, event_type, date_time, location, price_discovery, price_premium)
VALUES (
  'Apéro découverte',
  'Premier apéro pour découvrir la communauté',
  'discovery',
  '2024-02-15 19:00:00+01',
  'Paris 11e',
  5.00,
  0.00
);
```

#### Créer une masterclass test :
```sql
INSERT INTO masterclasses (title, description, expert_name, date_time, category)
VALUES (
  'Confiance en soi au travail',
  'Masterclass avec une coach experte',
  'Sophie Martin',
  '2024-02-20 20:00:00+01',
  'Développement personnel'
);
```

## ✅ ORDRE D'EXÉCUTION :

1. **Colonnes manquantes** (étape 1)
2. **Activer RLS** (étape 2)
3. **Créer les politiques** (étape 3) - une par une
4. **Créer les fonctions** (étape 4)
5. **Créer les triggers** (étape 5)
6. **Créer les index** (étape 6)
7. **Tester** (étape 8)

Faites ça étape par étape et dites-moi où vous en êtes ! 🚀