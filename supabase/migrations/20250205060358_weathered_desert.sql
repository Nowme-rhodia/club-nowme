/*
  # Ajout de colonnes à la table partners

  1. Nouvelles colonnes
    - `description` (text) : Description de l'entreprise
    - `logo_url` (text) : URL du logo de l'entreprise
    - `address` (text) : Adresse physique
    - `coordinates` (point) : Coordonnées géographiques
    - `social_media` (jsonb) : Liens réseaux sociaux
    - `opening_hours` (jsonb) : Horaires d'ouverture

  2. Modifications
    - Ajout de contraintes NOT NULL où nécessaire
    - Ajout de valeurs par défaut pour les champs JSON
*/

-- Ajout des nouvelles colonnes
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS coordinates point,
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{}';

-- Mise à jour de la fonction de validation des coordonnées
CREATE OR REPLACE FUNCTION validate_coordinates()
RETURNS trigger AS $$
BEGIN
  IF NEW.coordinates IS NOT NULL THEN
    -- Vérifier que les coordonnées sont dans des limites raisonnables pour l'Île-de-France
    IF (NEW.coordinates[0] < 48.1 OR NEW.coordinates[0] > 49.2 OR
        NEW.coordinates[1] < 1.4 OR NEW.coordinates[1] > 3.5) THEN
      RAISE EXCEPTION 'Les coordonnées doivent être dans la région Île-de-France';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour la validation des coordonnées
DROP TRIGGER IF EXISTS validate_partner_coordinates ON partners;
CREATE TRIGGER validate_partner_coordinates
  BEFORE INSERT OR UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION validate_coordinates();

-- Commentaires sur les colonnes
COMMENT ON COLUMN partners.description IS 'Description de l''entreprise partenaire';
COMMENT ON COLUMN partners.logo_url IS 'URL du logo de l''entreprise';
COMMENT ON COLUMN partners.address IS 'Adresse physique de l''entreprise';
COMMENT ON COLUMN partners.coordinates IS 'Coordonnées géographiques (latitude, longitude)';
COMMENT ON COLUMN partners.social_media IS 'Liens des réseaux sociaux au format JSON';
COMMENT ON COLUMN partners.opening_hours IS 'Horaires d''ouverture au format JSON';