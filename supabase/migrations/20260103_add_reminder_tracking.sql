-- Add reminder tracking columns to micro_squads
ALTER TABLE public.micro_squads
ADD COLUMN IF NOT EXISTS reminder_7d_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_3d_sent_at TIMESTAMPTZ;
