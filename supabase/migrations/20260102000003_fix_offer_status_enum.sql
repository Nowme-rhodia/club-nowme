-- Add 'archived' to offer_status enum
ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'archived';
