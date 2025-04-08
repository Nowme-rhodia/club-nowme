-- Ajout de la politique pour permettre aux utilisateurs de créer leur profil
CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ajout de la politique pour permettre aux utilisateurs de créer leur QR code
CREATE POLICY "Users can create their own QR code"
  ON user_qr_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_profile_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Ajout des politiques pour les administrateurs
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update subscription status"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');