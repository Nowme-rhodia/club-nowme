-- Add rejection_reason column to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
