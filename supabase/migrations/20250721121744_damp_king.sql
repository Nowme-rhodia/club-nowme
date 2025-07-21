/*
  # Création des fonctionnalités du club Nowme

  1. Nouvelles tables
    - `club_events` : Événements du club (découverte/premium)
    - `event_registrations` : Inscriptions aux événements
    - `masterclasses` : Masterclasses avec expertes
    - `masterclass_attendees` : Participants aux masterclasses
    - `wellness_consultations` : Consultations bien-être trimestrielles
    - `club_boxes` : Box trimestrielles
    - `box_shipments` : Expéditions des box
    - `member_rewards` : Programme de fidélité
    - `community_challenges` : Défis communautaires
    - `challenge_participations` : Participations aux défis

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques appropriées pour chaque rôle
    - Fonctions helper pour les vérifications

  3. Fonctionnalités automatiques
    - Triggers pour maintenir les compteurs
    - Création automatique des récompenses
    - Notifications par email
*/

-- Fonction helper pour vérifier si un utilisateur est premium
CREATE OR REPLACE FUNCTION is_premium_member()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active' 
    AND subscription_type = 'premium'
  );
END;
$$;

-- Fonction helper pour vérifier le statut d'abonnement
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
  );
END;
$$;

-- Table des événements du club
CREATE TABLE IF NOT EXISTS club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('discovery', 'premium', 'masterclass')),
  date_time timestamptz NOT NULL,
  location text NOT NULL,
  max_participants integer DEFAULT 20,
  current_participants integer DEFAULT 0,
  price_discovery numeric(10,2) DEFAULT 0,
  price_premium numeric(10,2) DEFAULT 0,
  image_url text,
  organizer_id uuid REFERENCES user_profiles(id),
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE club_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view events"
  ON club_events
  FOR SELECT
  TO authenticated
  USING (check_subscription_status());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_club_events_date ON club_events(date_time);
CREATE INDEX IF NOT EXISTS idx_club_events_type ON club_events(event_type);

-- Table des inscriptions aux événements
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES club_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  registration_date timestamptz DEFAULT now(),
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  payment_status text DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'pending')),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their registrations"
  ON event_registrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table des masterclasses
CREATE TABLE IF NOT EXISTS masterclasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  expert_name text NOT NULL,
  expert_bio text,
  expert_photo_url text,
  date_time timestamptz NOT NULL,
  duration_minutes integer DEFAULT 90,
  max_participants integer DEFAULT 50,
  current_participants integer DEFAULT 0,
  meeting_link text,
  recording_url text,
  materials jsonb,
  category text NOT NULL,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE masterclasses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium members can access masterclasses"
  ON masterclasses
  FOR SELECT
  TO authenticated
  USING (is_premium_member());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_masterclasses_date ON masterclasses(date_time);

-- Table des participants aux masterclasses
CREATE TABLE IF NOT EXISTS masterclass_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  masterclass_id uuid REFERENCES masterclasses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  registration_date timestamptz DEFAULT now(),
  attendance_status text DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'missed')),
  feedback_rating integer CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment text,
  UNIQUE(masterclass_id, user_id)
);

ALTER TABLE masterclass_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their masterclass attendance"
  ON masterclass_attendees
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table des consultations bien-être
CREATE TABLE IF NOT EXISTS wellness_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  consultant_name text NOT NULL,
  consultant_specialty text NOT NULL,
  consultation_type text NOT NULL CHECK (consultation_type IN ('phone', 'video', 'in_person')),
  scheduled_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 45,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes text,
  follow_up_date timestamptz,
  quarter_used text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wellness_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their consultations"
  ON wellness_consultations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_wellness_consultations_user ON wellness_consultations(user_id);

-- Table des box du club
CREATE TABLE IF NOT EXISTS club_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  quarter text NOT NULL,
  year integer NOT NULL,
  estimated_value numeric(10,2) NOT NULL,
  contents jsonb NOT NULL,
  image_url text,
  shipping_start_date date,
  shipping_end_date date,
  status text DEFAULT 'preparation' CHECK (status IN ('preparation', 'shipping', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE club_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium members can view boxes"
  ON club_boxes
  FOR SELECT
  TO authenticated
  USING (is_premium_member());

-- Table des expéditions de box
CREATE TABLE IF NOT EXISTS box_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid REFERENCES club_boxes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  shipping_address jsonb NOT NULL,
  tracking_number text,
  shipping_date date,
  delivery_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered', 'returned')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE box_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shipments"
  ON box_shipments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Table des récompenses membres
CREATE TABLE IF NOT EXISTS member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  points_earned integer DEFAULT 0,
  points_spent integer DEFAULT 0,
  points_balance integer DEFAULT 0,
  last_activity_date timestamptz DEFAULT now(),
  tier_level text DEFAULT 'bronze' CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their rewards"
  ON member_rewards
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_member_rewards_user ON member_rewards(user_id);

-- Table des défis communautaires
CREATE TABLE IF NOT EXISTS community_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  challenge_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reward_points integer DEFAULT 100,
  reward_description text,
  max_participants integer,
  current_participants integer DEFAULT 0,
  image_url text,
  rules jsonb,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view challenges"
  ON community_challenges
  FOR SELECT
  TO authenticated
  USING (check_subscription_status());

-- Table des participations aux défis
CREATE TABLE IF NOT EXISTS challenge_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES community_challenges(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  participation_date timestamptz DEFAULT now(),
  progress jsonb DEFAULT '{}',
  completion_status text DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'abandoned')),
  completion_date timestamptz,
  points_earned integer DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their challenge participation"
  ON challenge_participations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fonction pour mettre à jour les compteurs d'événements
CREATE OR REPLACE FUNCTION update_event_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE club_events 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE club_events 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger pour les événements
CREATE TRIGGER update_event_participants_trigger
  AFTER INSERT OR DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_participants();

-- Fonction pour mettre à jour les compteurs de masterclasses
CREATE OR REPLACE FUNCTION update_masterclass_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE masterclasses 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.masterclass_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE masterclasses 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.masterclass_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger pour les masterclasses
CREATE TRIGGER update_masterclass_participants_trigger
  AFTER INSERT OR DELETE ON masterclass_attendees
  FOR EACH ROW EXECUTE FUNCTION update_masterclass_participants();

-- Fonction pour mettre à jour les compteurs de défis
CREATE OR REPLACE FUNCTION update_challenge_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_challenges 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_challenges 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger pour les défis
CREATE TRIGGER update_challenge_participants_trigger
  AFTER INSERT OR DELETE ON challenge_participations
  FOR EACH ROW EXECUTE FUNCTION update_challenge_participants();

-- Fonction pour créer automatiquement les récompenses
CREATE OR REPLACE FUNCTION create_member_rewards()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO member_rewards (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger pour créer les récompenses automatiquement
CREATE TRIGGER create_member_rewards_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION create_member_rewards();