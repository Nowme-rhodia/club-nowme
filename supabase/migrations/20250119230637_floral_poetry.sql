/*
  # Ajout du champ SIRET

  1. Modifications
    - Ajout du champ SIRET à la table pending_partners
    - Ajout d'une contrainte de format pour le SIRET
  
  2. Sécurité
    - Pas de changement aux politiques existantes
*/

ALTER TABLE pending_partners
ADD COLUMN siret text NOT NULL CHECK (siret ~ '^\d{14}$');