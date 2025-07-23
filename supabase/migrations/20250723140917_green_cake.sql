/*
  # Mise à jour des types d'abonnement

  1. Modifications
    - Mise à jour des types d'abonnement : discovery/premium → monthly/yearly
    - Tous les utilisateurs ont accès à tout dès le 1er mois
    - Différence : plan annuel a des bonus supplémentaires

  2. Tables modifiées
    - user_profiles : subscription_type
    - Mise à jour des données existantes

  3. Fonctions
    - Mise à jour des fonctions de vérification d'abonnement
*/

-- Mettre à jour les types d'abonnement existants
UPDATE user_profiles 
SET subscription_type = CASE 
  WHEN subscription_type = 'discovery' THEN 'monthly'
  WHEN subscription_type = 'premium' THEN 'monthly'
  ELSE subscription_type
END
WHERE subscription_type IN ('discovery', 'premium');

-- Créer une fonction pour vérifier si l'utilisateur a un abonnement actif
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction pour vérifier si l'utilisateur est membre annuel (pour les bonus)
CREATE OR REPLACE FUNCTION is_yearly_member()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND subscription_status = 'active'
    AND subscription_type = 'yearly'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour les politiques RLS pour utiliser la nouvelle logique
DROP POLICY IF EXISTS "Premium members can access masterclasses" ON masterclasses;
CREATE POLICY "Members can access masterclasses" ON masterclasses
FOR SELECT TO authenticated
USING (check_subscription_status());

DROP POLICY IF EXISTS "Premium members can view boxes" ON club_boxes;
CREATE POLICY "Members can view boxes" ON club_boxes
FOR SELECT TO authenticated
USING (check_subscription_status());

DROP POLICY IF EXISTS "Members can view challenges" ON community_challenges;
CREATE POLICY "Members can view challenges" ON community_challenges
FOR SELECT TO authenticated
USING (check_subscription_status());