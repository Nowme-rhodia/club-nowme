-- Migration: Add additional_benefits column to offers table
-- Description: Allows partners to specify non-monetary benefits/perks included with offers

ALTER TABLE offers ADD COLUMN IF NOT EXISTS additional_benefits TEXT;

COMMENT ON COLUMN offers.additional_benefits IS 'Non-monetary benefits or perks included with the offer (e.g., "+ une course de voitures télécommandées offerte")';
