-- Add installment_options to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS installment_options text[] DEFAULT '{}';

-- Update RLS if necessary (usually authenticated users can read offers, partners can update only their own)
-- Existing policies should cover update if it's just a new column on existing table, 
-- but ensuring the column is accessible is good practice.

COMMENT ON COLUMN public.offers.installment_options IS 'Array of allowed installment plans: 2x, 3x, 4x';
