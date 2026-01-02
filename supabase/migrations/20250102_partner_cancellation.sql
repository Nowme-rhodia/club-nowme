-- Migration: Add Partner Cancellation Support
-- Date: 2025-01-02
-- Description: Adds columns for cancellation tracking and partner penalties, and tables for CGP versioning.

-- 1. Update bookings table to track cancellations
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by_partner BOOLEAN DEFAULT FALSE;

-- 2. Update partners table to track financial penalties
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS pending_penalties NUMERIC DEFAULT 0;

-- 3. Create CGP Versions table (Lead Legal Requirement)
CREATE TABLE IF NOT EXISTS public.cgp_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number TEXT NOT NULL, -- e.g. "1.2.0"
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT FALSE
);

-- 4. Track Partner CGP Acceptance
CREATE TABLE IF NOT EXISTS public.partner_cgp_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  cgp_version_id UUID REFERENCES public.cgp_versions(id),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, cgp_version_id)
);

-- 5. RLS Policies (Security)

-- Allow partners to view CGP versions
ALTER TABLE public.cgp_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active CGP versions" ON public.cgp_versions;
CREATE POLICY "Anyone can view active CGP versions" 
ON public.cgp_versions FOR SELECT 
USING (active = true);

-- Allow partners to insert their acceptance
ALTER TABLE public.partner_cgp_acceptance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can view their own acceptance" ON public.partner_cgp_acceptance;
CREATE POLICY "Partners can view their own acceptance" 
ON public.partner_cgp_acceptance FOR SELECT 
USING (auth.uid() IN (
    SELECT user_id FROM public.user_profiles WHERE partner_id = partner_cgp_acceptance.partner_id
));

DROP POLICY IF EXISTS "Partners can record acceptance" ON public.partner_cgp_acceptance;
CREATE POLICY "Partners can record acceptance" 
ON public.partner_cgp_acceptance FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_profiles WHERE partner_id = partner_cgp_acceptance.partner_id
));
