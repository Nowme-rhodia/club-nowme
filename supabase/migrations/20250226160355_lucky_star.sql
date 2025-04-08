/*
  # Optimisation des politiques RLS et ajout de tables de support

  1. Modifications
     - Optimise les politiques RLS en remplaçant auth.uid() par (SELECT auth.uid())
     - Résout les politiques multiples permissives
     - Ajoute des tables pour les notifications et logs d'emails
  
  2. Tables ajoutées
     - partner_notifications: pour les notifications des partenaires
     - email_logs: pour le suivi des emails envoyés
*/

-- Optimisation des politiques RLS pour partners
ALTER POLICY "Partners can read their own data" ON partners 
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Partners can insert their own data" ON partners 
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Partners can update their own data" ON partners 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Optimisation des politiques RLS pour offers
ALTER POLICY "Partners can read their own offers" ON offers 
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Partners can insert their own offers" ON offers 
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Partners can update their own offers" ON offers 
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Partners can delete their own offers" ON offers 
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ));

-- Optimisation des politiques RLS pour offer_prices
ALTER POLICY "Partners can read offer prices" ON offer_prices 
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

ALTER POLICY "Partners can insert offer prices" ON offer_prices 
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

ALTER POLICY "Partners can update offer prices" ON offer_prices 
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ))
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

ALTER POLICY "Partners can delete offer prices" ON offer_prices 
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

-- Optimisation des politiques RLS pour offer_media
ALTER POLICY "Partners can read offer media" ON offer_media 
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

ALTER POLICY "Partners can insert offer media" ON offer_media 
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

ALTER POLICY "Partners can update offer media" ON offer_media 
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ))
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

ALTER POLICY "Partners can delete offer media" ON offer_media 
  USING (offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (
      SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
    )
  ));

-- Optimisation des politiques RLS pour pending_partners
ALTER POLICY "Admins can read pending partners" ON pending_partners 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin');

ALTER POLICY "Admins can insert pending partners" ON pending_partners 
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'admin');

ALTER POLICY "Admins can update pending partners" ON pending_partners 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'admin');

-- Optimisation des politiques RLS pour pending_offers
ALTER POLICY "Admins can read pending offers" ON pending_offers 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin');

ALTER POLICY "Admins can insert pending offers" ON pending_offers 
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'admin');

ALTER POLICY "Admins can update pending offers" ON pending_offers 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'admin');

-- Optimisation des politiques RLS pour user_profiles
ALTER POLICY "Users can view own profile" ON user_profiles 
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can update own profile" ON user_profiles 
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can create their own profile" ON user_profiles 
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Admins can view all profiles" ON user_profiles 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin');

ALTER POLICY "Admins can update subscription status" ON user_profiles 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() ->> 'role') = 'admin');

-- Optimisation des politiques RLS pour user_qr_codes
ALTER POLICY "Users can view own QR code" ON user_qr_codes 
  USING (user_profile_id IN (
    SELECT id FROM user_profiles WHERE user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can create their own QR code" ON user_qr_codes 
  WITH CHECK (user_profile_id IN (
    SELECT id FROM user_profiles WHERE user_id = (SELECT auth.uid())
  ));

-- Optimisation des politiques RLS pour region_requests
ALTER POLICY "Enable read for admins" ON region_requests 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin');

-- Optimisation des politiques RLS pour stripe_webhook_events
ALTER POLICY "Allow admins to read webhook events" ON stripe_webhook_events 
  USING ((SELECT auth.jwt() ->> 'role') = 'admin');

-- Résolution des politiques multiples permissives
-- Pour pending_partners
DROP POLICY IF EXISTS "Enable insert for everyone" ON pending_partners;
DROP POLICY IF EXISTS "Enable read access for own submissions" ON pending_partners;

-- Pour pending_offers
DROP POLICY IF EXISTS "Enable insert for everyone" ON pending_offers;
DROP POLICY IF EXISTS "Enable read access for own submissions" ON pending_offers;

-- Création d'une table pour les notifications partenaires
CREATE TABLE IF NOT EXISTS partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'normal', 'low')),
  data jsonb DEFAULT '{}',
  read_status boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Création d'une table pour les logs d'emails
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES emails(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Ajout de colonnes pour la gestion des retries d'emails
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry timestamptz,
ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
ADD COLUMN IF NOT EXISTS error_log text;

-- Ajout d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_partner_notifications_partner_id ON partner_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_read_status ON partner_notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_id ON email_logs(email_id);
CREATE INDEX IF NOT EXISTS idx_emails_next_retry ON emails(next_retry_at) WHERE status = 'pending';

-- Enable RLS sur les nouvelles tables
ALTER TABLE partner_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour partner_notifications
CREATE POLICY "Partners can view their own notifications"
  ON partner_notifications
  FOR SELECT
  TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Partners can update their own notifications"
  ON partner_notifications
  FOR UPDATE
  TO authenticated
  USING (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (partner_id IN (
    SELECT id FROM partners WHERE user_id = (SELECT auth.uid())
  ));

-- Politiques RLS pour email_logs
CREATE POLICY "Admins can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'role') = 'admin');

-- Commentaires
COMMENT ON TABLE partner_notifications IS 'Notifications pour les partenaires';
COMMENT ON TABLE email_logs IS 'Logs des emails envoyés';
COMMENT ON COLUMN emails.retry_count IS 'Nombre de tentatives d''envoi';
COMMENT ON COLUMN emails.last_retry IS 'Date de la dernière tentative';
COMMENT ON COLUMN emails.next_retry_at IS 'Date de la prochaine tentative';
COMMENT ON COLUMN emails.error_log IS 'Message d''erreur de la dernière tentative';