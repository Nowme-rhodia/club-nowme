/*
  # Ajout des contraintes pour les sous-catégories bars et boîte de nuit

  1. Modifications
    - Ajout d'une fonction de validation pour les sous-catégories de culture et divertissement
    - Ajout d'un trigger pour valider les sous-catégories lors de l'insertion/mise à jour

  2. Sécurité
    - Validation des données pour assurer l'intégrité des sous-catégories
*/

-- Création d'une fonction pour valider les sous-catégories
CREATE OR REPLACE FUNCTION validate_subcategories()
RETURNS trigger AS $$
BEGIN
  -- Validation pour culture-et-divertissement
  IF NEW.category_slug = 'culture-et-divertissement' AND
     NEW.subcategory_slug NOT IN (
      'autre-culture-et-divertissement',
      'bars',
      'boite-de-nuit',
      'dj-animateur-de-soiree',
      'entreprise-devenementiel-culturel',
      'game-room',
      'one-wo-man-show',
      'organisateur-de-concerts',
      'organisateur-de-soirees-a-theme',
      'theatre-salle-de-spectacle'
    ) THEN
    RAISE EXCEPTION 'Sous-catégorie invalide pour culture-et-divertissement: %', NEW.subcategory_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création des triggers pour les tables offers et pending_offers
DO $$ BEGIN
  -- Suppression des triggers existants s'ils existent
  DROP TRIGGER IF EXISTS validate_subcategories_offers ON offers;
  DROP TRIGGER IF EXISTS validate_subcategories_pending ON pending_offers;
  
  -- Création des nouveaux triggers
  CREATE TRIGGER validate_subcategories_offers
    BEFORE INSERT OR UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION validate_subcategories();

  CREATE TRIGGER validate_subcategories_pending
    BEFORE INSERT OR UPDATE ON pending_offers
    FOR EACH ROW
    EXECUTE FUNCTION validate_subcategories();
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;