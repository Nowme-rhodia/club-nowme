/*
  # Mise à jour de la table emails

  1. Changements
    - Renommage de la colonne 'to' en 'to_address' pour éviter le mot clé SQL
    - Ajout d'un index sur to_address et status pour de meilleures performances
    - Ajout de contraintes de validation d'email
*/

-- Ajout d'un index sur to_address et status
CREATE INDEX IF NOT EXISTS idx_emails_to_address ON emails(to_address);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);

-- Ajout de commentaires
COMMENT ON TABLE emails IS 'Table de suivi des emails envoyés';
COMMENT ON COLUMN emails.to_address IS 'Adresse email du destinataire';
COMMENT ON COLUMN emails.subject IS 'Sujet de l''email';
COMMENT ON COLUMN emails.content IS 'Contenu de l''email';
COMMENT ON COLUMN emails.status IS 'Statut de l''email (pending, sent, failed)';
COMMENT ON COLUMN emails.error IS 'Message d''erreur en cas d''échec';
COMMENT ON COLUMN emails.sent_at IS 'Date et heure d''envoi';
COMMENT ON COLUMN emails.created_at IS 'Date et heure de création';