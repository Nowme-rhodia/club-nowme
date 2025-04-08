-- Fix Function Search Path Mutable warnings by setting explicit search paths
ALTER FUNCTION validate_coordinates() SET search_path = public;
ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION validate_subcategories() SET search_path = public;

-- Add IMMUTABLE keyword to functions where appropriate
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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Add comments to document function behavior
COMMENT ON FUNCTION validate_coordinates() IS 'Validates that coordinates are within Île-de-France region';
COMMENT ON FUNCTION update_updated_at_column() IS 'Updates the updated_at timestamp when a row is modified';
COMMENT ON FUNCTION validate_subcategories() IS 'Validates subcategory values for different categories';